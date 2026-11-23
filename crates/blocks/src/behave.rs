use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::built::{children, Built};
use crate::expr::{eval, text, Expr, Lit, Pattern, State};
use crate::gesture::Word;
use crate::kind::Check;

/// What the state makes of a screen: hidden blocks and fields, disabled controls and acts, messages, bound values.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct View {
    pub hidden: BTreeSet<String>,
    pub disabled: BTreeSet<String>,
    pub says: BTreeMap<String, String>,
    pub acts: BTreeSet<String>,
    pub values: BTreeMap<String, String>,
}

fn holds(b: &Value, key: &str, state: &State) -> Option<bool> {
    let e = Expr::deserialize(b.get(key).filter(|v| !v.is_null())?).ok()?;
    e.known().then(|| eval(&e, state) == Lit::Bool(true))
}

fn checks(f: &Value) -> Vec<Check> {
    let all = f.get("checks").and_then(Value::as_array).into_iter().flatten();
    let written = all.filter(|c| c.get("ok").is_some_and(|ok| !ok.is_null()));
    written.filter_map(|c| Check::deserialize(c).ok()).collect()
}

fn acts(o: &serde_json::Map<String, Value>) -> Vec<&Value> {
    let mut all: Vec<&Value> = ["actions", "swipe", "menu"]
        .iter()
        .filter_map(|k| o.get(*k)?.as_array())
        .flatten()
        .chain(std::iter::once("button").chain(Word::ALL).filter_map(|k| o.get(k)))
        .collect();
    let menus: Vec<&Value> = all.iter().filter_map(|a| a.get("menu")?.as_array()).flatten().collect();
    all.extend(menus);
    all
}

pub(crate) fn sends(act: &Value) -> Option<&str> {
    let tap = || act.get("tap")?.get("action");
    act.get("action").or_else(tap)?.as_str()
}

fn bound(v: &Value) -> Option<&str> {
    v.get("get")?.as_str()
}

fn fields(o: &serde_json::Map<String, Value>) -> impl Iterator<Item = (&str, &Value)> {
    let all = o.get("fields").and_then(Value::as_array).into_iter().flatten();
    all.filter_map(|f| Some((f.get("name")?.as_str()?, f)))
}

fn plain(s: &str) -> Option<f64> {
    let t: String = s.chars().filter(|c| *c != ',' && !c.is_whitespace()).collect();
    let body = t.strip_prefix(['+', '-']).unwrap_or(&t);
    let (int, frac) = body.split_once('.').unwrap_or((body, ""));
    let digits = |p: &str| p.chars().all(|c| c.is_ascii_digit());
    (!(int.is_empty() && frac.is_empty()) && digits(int) && digits(frac)).then(|| t.parse().ok())?
}

pub(crate) fn calc(e: &Value, values: &Value) -> Value {
    let Ok(e) = Expr::deserialize(e) else {
        return Value::Null;
    };
    let lit = |v: &Value| match v {
        Value::String(s) => plain(s)
            .and_then(serde_json::Number::from_f64)
            .map_or_else(|| Lit::Str(s.clone()), Lit::Num),
        v => Lit::deserialize(v).unwrap_or_default(),
    };
    let state = values
        .as_object()
        .into_iter()
        .flatten()
        .map(|(k, v)| (k.clone(), lit(v)))
        .collect();
    serde_json::to_value(eval(&e, &state)).unwrap_or_default()
}

/// What `field` holding `held` puts in local state: null, a switch, a number or a string; a list puts its length, an empty one null.
pub fn lit(_field: &Value, held: &Value) -> Lit {
    match held.as_array().map(Vec::len) {
        Some(0) => Lit::Null,
        Some(n) => Lit::Num(n.into()),
        None => Lit::deserialize(held).unwrap_or_default(),
    }
}

/// The screen's start state: its `state`, each field's `value` and each chips' first `selected`.
pub fn start(screen: &Built) -> State {
    start_of(screen.value())
}

fn start_of(v: &Value) -> State {
    let mut s: State = v
        .get("state")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();
    seed(v, &mut s);
    s
}

pub(crate) fn at_start(v: &Value) -> View {
    let mut out = View::default();
    walk(v, &start_of(v), &mut out);
    out
}

fn seed(b: &Value, s: &mut State) {
    let Some(o) = b.as_object() else { return };
    for (name, f) in fields(o) {
        let one = f
            .get("file")
            .filter(|x| x.is_object())
            .map(|x| Value::Array(vec![x.clone()]));
        let low = f
            .get("min")
            .filter(|_| f.get("type").and_then(Value::as_str) == Some("slider"));
        let held = f.get("value").or_else(|| f.get("files")).or(one.as_ref()).or(low);
        s.insert(name.into(), lit(f, held.unwrap_or(&Value::Null)));
    }
    if let (Some("chips"), Some(Value::String(name))) = (o.get("type").and_then(Value::as_str), o.get("name")) {
        let first = o.get("selected").and_then(Value::as_array).and_then(|a| a.first());
        s.insert(
            name.clone(),
            first
                .and_then(|v| serde_json::from_value(v.clone()).ok())
                .unwrap_or_default(),
        );
    }
    children(o).for_each(|c| seed(c, s));
}

/// What `state` makes of `screen`: a `show` or `enabled` that does not hold, a check that fails, a bound value's text.
pub fn view(screen: &Built, state: &State) -> View {
    let mut v = View::default();
    walk(screen.value(), state, &mut v);
    v
}

fn walk(b: &Value, state: &State, v: &mut View) {
    let Some(o) = b.as_object() else { return };
    let id = o.get("id").and_then(Value::as_str).map(String::from);
    if holds(b, "show", state) == Some(false) {
        v.hidden.extend(id);
        return;
    }
    if holds(b, "enabled", state) == Some(false) {
        v.disabled.extend(id.clone());
    }
    let mut failing = false;
    for (name, f) in fields(o) {
        if holds(f, "show", state) == Some(false) {
            v.hidden.insert(name.into());
            continue;
        }
        if holds(f, "enabled", state) == Some(false) {
            v.disabled.insert(name.into());
        }
        let fails = |c: &&Check| c.ok.known() && eval(&c.ok, state) != Lit::Bool(true);
        if let Some(c) = checks(f).iter().find(fails) {
            failing = true;
            v.says.insert(name.into(), c.say.clone());
        }
    }
    if failing {
        v.disabled.extend(id);
    }
    for a in acts(o)
        .into_iter()
        .filter(|a| holds(a, "enabled", state) == Some(false))
    {
        v.acts.extend(sends(a).map(String::from));
    }
    let items = o.get("items").and_then(Value::as_array).into_iter().flatten();
    for k in std::iter::once(b).chain(items).filter_map(|i| bound(i.get("value")?)) {
        v.values.insert(k.into(), text(state.get(k).unwrap_or(&Lit::Null)));
    }
    children(o).for_each(|c| walk(c, state, v));
}

/// The input attributes a field's checks give a page with no script: `required`, `type` and `maxlength`.
pub fn hints(field: &Value) -> Vec<(&'static str, String)> {
    let name = field.get("name").and_then(Value::as_str).unwrap_or_default();
    let me = |e: &Expr| matches!(e, Expr::Get(k) if k == name);
    let len = |e: &Expr| matches!(e, Expr::Len(x) if me(x));
    let int = |e: &Expr| match e {
        Expr::Lit(Lit::Num(n)) => n.as_u64(),
        _ => None,
    };
    let bound = |p: &[Expr; 2], below: bool| match (p, below) {
        ([a, b], true) if len(a) => int(b).and_then(|n| n.checked_sub(1)),
        ([a, b], false) if len(b) => int(a),
        _ => None,
    };
    let hint = |c: &Check| match &c.ok {
        Expr::Is(m) if me(&m.value) && m.pattern == Pattern::Filled => Some(("required", String::new())),
        Expr::Is(m) if me(&m.value) && m.pattern == Pattern::Email => Some(("type", "email".into())),
        Expr::Lt(p) => bound(p, true).map(|n| ("maxlength", n.to_string())),
        Expr::Not(x) => match &**x {
            Expr::Lt(p) => bound(p, false).map(|n| ("maxlength", n.to_string())),
            _ => None,
        },
        _ => None,
    };
    checks(field).iter().filter_map(hint).collect()
}
