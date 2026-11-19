use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::built::{children, Built};
use crate::expr::{eval, Expr, Lit, Pattern, State};
use crate::kind::Check;

/// What the state makes of a screen: hidden blocks and fields, disabled controls, each failing field's message.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct View {
    pub hidden: BTreeSet<String>,
    pub disabled: BTreeSet<String>,
    pub says: BTreeMap<String, String>,
}

fn holds(b: &Value, key: &str, state: &State) -> Option<bool> {
    let e = Expr::deserialize(b.get(key).filter(|v| !v.is_null())?).ok()?;
    e.known().then(|| eval(&e, state) == Lit::Bool(true))
}

fn checks(f: &Value) -> Vec<Check> {
    let all = f.get("checks").and_then(Value::as_array).into_iter().flatten();
    all.filter_map(|c| Check::deserialize(c).ok()).collect()
}

fn fields(o: &serde_json::Map<String, Value>) -> impl Iterator<Item = (&str, &Value)> {
    let all = o.get("fields").and_then(Value::as_array).into_iter().flatten();
    all.filter_map(|f| Some((f.get("name")?.as_str()?, f)))
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
        let v = f.get("value").and_then(|v| serde_json::from_value(v.clone()).ok());
        s.insert(name.into(), v.unwrap_or_default());
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

/// What `state` makes of `screen`: a `show` or `enabled` that does not hold, a check that fails; keyed by id or name.
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
