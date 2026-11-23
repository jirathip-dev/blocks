use std::collections::BTreeMap;

use serde_json::{Map, Value};

use crate::behave::{start, view};
use crate::built::{children, Built, LISTS};
use crate::catalog::Catalog;
use crate::expr::State;

pub(super) type Fields = Map<String, Value>;

pub(super) struct Node<'a> {
    pub(super) o: &'a Fields,
    pub(super) kind: &'a str,
    pub(super) at: String,
    pub(super) depth: usize,
    pub(super) hidden: bool,
    pub(super) parent: Option<usize>,
    pub(super) kids: Vec<usize>,
}

pub(super) struct Cx<'a> {
    pub(super) screen: &'a Built,
    pub(super) app: &'a [&'a str],
    pub(super) catalog: Option<&'a Catalog>,
    pub(super) blocks: Vec<Node<'a>>,
}

pub(super) fn text<'a>(o: &'a Fields, k: &str) -> Option<&'a str> {
    o.get(k).and_then(Value::as_str)
}

pub(super) fn list<'a>(o: &'a Fields, k: &str) -> impl Iterator<Item = &'a Fields> {
    let all = o.get(k).and_then(Value::as_array).into_iter().flatten();
    all.filter_map(Value::as_object)
}

pub(super) fn sends(o: &Fields) -> Option<&str> {
    text(o, "action").or_else(|| o.get("tap")?.get("action")?.as_str())
}

pub(super) fn acts(o: &Fields) -> Vec<&Fields> {
    let mut all: Vec<&Fields> = ["actions", "swipe", "menu"].iter().flat_map(|k| list(o, k)).collect();
    all.extend(o.get("button").and_then(Value::as_object));
    let menus: Vec<&Fields> = all.iter().flat_map(|a| list(a, "menu")).collect();
    all.extend(menus);
    all
}

pub(super) fn each(o: &Fields, f: &mut dyn FnMut(&Fields, &str, &Value)) {
    static EMPTY: Value = Value::Array(Vec::new());
    fn fields(o: &Fields, f: &mut dyn FnMut(&Fields, &str, &Value), cut: &[&str], top: bool) {
        for (k, x) in o {
            let x = if cut.contains(&k.as_str()) { &EMPTY } else { x };
            f(o, k, x);
            match x {
                Value::Array(rounds) if top && k == "rounds" => rounds.iter().for_each(|r| match r {
                    Value::Object(r) => fields(r, f, &["blocks"], false),
                    r => walk(r, f),
                }),
                x => walk(x, f),
            }
        }
    }
    fn walk(v: &Value, f: &mut dyn FnMut(&Fields, &str, &Value)) {
        match v {
            Value::Object(o) => fields(o, f, &[], false),
            Value::Array(l) => l.iter().for_each(|x| walk(x, f)),
            _ => {}
        }
    }
    fields(o, f, &LISTS, true);
}

pub(super) fn starts(s: &str, with: &[String]) -> bool {
    let odd = s.chars().any(|c| c.is_whitespace() || c.is_control() || c == '\\');
    let schemeless = s.starts_with("//") && !with.iter().any(|w| w.starts_with("//"));
    !odd && !schemeless && with.iter().any(|w| s.starts_with(w.as_str()))
}

pub(super) fn md_links(s: &str) -> Vec<&str> {
    fn words(r: &str) -> impl Iterator<Item = &str> {
        r.split(|c: char| c.is_whitespace() || "()<>[]".contains(c))
    }
    let first = |r| words(r).next().unwrap_or_default();
    let mut out: Vec<&str> = s
        .split("](")
        .skip(1)
        .map(|r| first(r.trim_start_matches('<')))
        .collect();
    out.extend(s.split('<').skip(1).map(first).filter(|u| u.contains(':')));
    out.extend(words(s).filter(|w| w.contains("://")));
    out.retain(|u| !u.is_empty());
    out.sort_unstable();
    out.dedup();
    out
}

pub(super) fn long(s: &str, max: usize) -> Option<String> {
    let n = s.chars().count();
    (n > max).then(|| format!("{n} characters"))
}

impl<'a> Cx<'a> {
    pub(super) fn new(screen: &'a Built, app: &'a [&'a str]) -> Cx<'a> {
        Cx::at(screen, app, &start(screen))
    }

    pub(super) fn at(screen: &'a Built, app: &'a [&'a str], state: &State) -> Cx<'a> {
        let hidden = view(screen, state).hidden;
        let mut cx = Cx {
            screen,
            app,
            catalog: None,
            blocks: vec![],
        };
        if let Some(o) = screen.value().as_object() {
            cx.walk(o, None, "", 0, &|id| hidden.contains(id));
        }
        cx
    }

    fn walk(&mut self, o: &'a Fields, parent: Option<usize>, at: &str, n: usize, hide: &dyn Fn(&str) -> bool) {
        let kind = text(o, "type").unwrap_or_default();
        let id = text(o, "id");
        let me = id.map_or_else(|| format!("{kind}~{n}"), |id| format!("{kind}#{id}"));
        let at = if at.is_empty() { me } else { format!("{at}/{me}") };
        let up = parent.and_then(|p| self.blocks.get(p));
        let i = self.blocks.len();
        self.blocks.push(Node {
            o,
            kind,
            depth: up.map_or(0, |p| p.depth + 1),
            hidden: up.is_some_and(|p| p.hidden) || id.is_some_and(hide),
            parent,
            kids: vec![],
            at: at.clone(),
        });
        if let Some(p) = parent.and_then(|p| self.blocks.get_mut(p)) {
            p.kids.push(i);
        }
        let mut seen: BTreeMap<&str, usize> = BTreeMap::new();
        for c in children(o).filter_map(Value::as_object) {
            let k = text(c, "type").unwrap_or_default();
            let n = seen.entry(k).or_default();
            let at_n = *n;
            if c.get("id").is_none() {
                *n += 1;
            }
            self.walk(c, Some(i), &at, at_n, hide);
        }
    }

    pub(super) fn held(&self) -> impl Iterator<Item = (&'a Catalog, &Node<'a>)> {
        let held = self.blocks.iter().filter(|b| b.depth > 0);
        self.catalog
            .into_iter()
            .flat_map(move |c| held.clone().map(move |b| (c, b)))
    }

    pub(super) fn kids<'b>(&'b self, b: &'b Node) -> impl Iterator<Item = &'b Node<'a>> {
        b.kids.iter().filter_map(|i| self.blocks.get(*i))
    }

    pub(super) fn parent(&self, b: &Node) -> Option<&Node<'a>> {
        self.blocks.get(b.parent?)
    }
}
