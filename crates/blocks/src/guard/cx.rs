use std::collections::BTreeMap;

use serde_json::{Map, Value};

use crate::behave::{start, view};
use crate::built::{children, Built};
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

    pub(super) fn kids<'b>(&'b self, b: &'b Node) -> impl Iterator<Item = &'b Node<'a>> {
        b.kids.iter().filter_map(|i| self.blocks.get(*i))
    }

    pub(super) fn parent(&self, b: &Node) -> Option<&Node<'a>> {
        self.blocks.get(b.parent?)
    }
}
