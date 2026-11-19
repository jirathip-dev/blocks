use std::collections::{BTreeMap, BTreeSet};

use serde_json::{Map, Value};

use crate::kind::{Block, Fallback, Fields, Screen, Steps, Tap};

/// What makes a screen unfit to send: a server checks its own before it serves it.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Fault {
    Twice {
        id: String,
        at: [String; 2],
    },
    ActTwice {
        block: String,
        action: String,
        at: [String; 2],
    },
    Unnamed {
        kind: String,
    },
    Unknown {
        kind: String,
    },
    Shape {
        kind: String,
        why: String,
    },
    Extra {
        kind: String,
        field: String,
    },
    Clash {
        kind: String,
    },
    Bare {
        kind: String,
        id: String,
    },
    State {
        key: String,
    },
    Link {
        at: String,
        url: String,
    },
}

/// A screen as it goes on the wire: typed in with its fallbacks written, or read in as JSON.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Built(Value);

const LISTS: [&str; 3] = ["blocks", "rows", "buttons"];
const DRAWN: [&str; 3] = ["row", "text", "island"];
const LINKS: [&str; 5] = ["url", "href", "link", "open", "src"];

pub(crate) fn linkable(url: &str) -> bool {
    let head = url.split(['/', '?', '#']).next().unwrap_or_default();
    head.split_once(':').is_none_or(|(scheme, _)| {
        let bare = scheme.chars().filter(|c| *c > ' ' && !c.is_control());
        ["http", "https", "mailto"]
            .iter()
            .any(|s| bare.clone().map(|c| c.to_ascii_lowercase()).eq(s.chars()))
    })
}

fn placed(o: &Fields) -> impl Iterator<Item = (String, &Value)> {
    let lists = LISTS.iter().filter_map(|k| Some(((*k).to_string(), o.get(*k)?)));
    let rounds = o.get("rounds").and_then(Value::as_array).into_iter().flatten();
    let in_rounds = rounds
        .enumerate()
        .filter_map(|(i, r)| Some((format!("rounds/{i}/blocks"), r.get("blocks")?)));
    lists
        .chain(in_rounds)
        .filter_map(|(at, l)| Some((at, l.as_array()?)))
        .flat_map(|(at, l)| l.iter().enumerate().map(move |(i, v)| (format!("{at}/{i}"), v)))
}

pub(crate) fn children(o: &Fields) -> impl Iterator<Item = &Value> {
    placed(o).map(|(_, v)| v)
}

fn kind(o: &Fields) -> &str {
    o.get("type").and_then(Value::as_str).unwrap_or_default()
}

fn plain(o: &Fields) -> Fallback {
    let text = |k: &str| o.get(k).and_then(Value::as_str).filter(|s| !s.is_empty());
    let named = [
        "title", "label", "header", "question", "name", "file", "command", "source", "src",
    ];
    Fallback {
        title: named.into_iter().find_map(text).unwrap_or(kind(o)).into(),
        subtitle: text("subtitle").map(Into::into),
        tap: o.get("tap").and_then(|t| serde_json::from_value::<Tap>(t.clone()).ok()),
    }
}

fn write_fallbacks(v: &mut Value) {
    let Value::Object(o) = v else { return };
    let k = kind(o);
    if Block::KINDS.contains(&k) && !DRAWN.contains(&k) && !o.contains_key("fallback") {
        if let Ok(f) = serde_json::to_value(plain(o)) {
            o.insert("fallback".into(), f);
        }
    }
    for key in LISTS {
        o.get_mut(key).into_iter().for_each(each_block);
    }
    for r in o.get_mut("rounds").and_then(Value::as_array_mut).into_iter().flatten() {
        r.get_mut("blocks").into_iter().for_each(each_block);
    }
}

fn each_block(list: &mut Value) {
    list.as_array_mut().into_iter().flatten().for_each(write_fallbacks);
}

fn shallow(o: &Fields) -> Value {
    let mut top = o.clone();
    for key in LISTS {
        if let Some(l) = top.get_mut(key) {
            *l = Value::Array(vec![]);
        }
    }
    for r in top
        .get_mut("rounds")
        .and_then(Value::as_array_mut)
        .into_iter()
        .flatten()
    {
        if let Some(l) = r.get_mut("blocks") {
            *l = Value::Array(vec![]);
        }
    }
    Value::Object(top)
}

fn unplaced(s: &Steps) -> Option<&'static str> {
    let steps = s.steps.as_deref().unwrap_or_default();
    let at = s.current.as_ref().map(|c| steps.iter().any(|x| &x.id == c));
    if steps.is_empty() {
        return None;
    }
    match (s.bars.is_some(), at, s.done == Some(true)) {
        (true, ..) => Some("a steps block with both steps and bars"),
        (false, Some(false), _) => Some("a stepper whose current names no step"),
        (false, Some(true), true) => Some("a stepper both done and at a current step"),
        (false, None, false) => Some("a stepper with neither a current step nor done"),
        (false, Some(true), false) | (false, None, true) => None,
    }
}

struct Walk<'a> {
    app: &'a [&'a str],
    ids: BTreeMap<String, String>,
    acts: BTreeMap<(String, String), String>,
    keys: Vec<String>,
    out: Vec<Fault>,
}

impl Walk<'_> {
    fn block(&mut self, v: &Value, at: &str, scope: &str) {
        let Value::Object(o) = v else {
            let why = "a block that is no object".into();
            return self.out.push(Fault::Shape {
                kind: String::new(),
                why,
            });
        };
        let k = kind(o).to_string();
        let id = o.get("id").and_then(Value::as_str);
        match id {
            Some("") => self.out.push(Fault::Unnamed { kind: k.clone() }),
            Some(id) => {
                if let Some(first) = self.ids.insert(id.into(), at.into()) {
                    self.out.push(Fault::Twice {
                        id: id.into(),
                        at: [first, at.into()],
                    });
                }
            }
            None if k == "island" => self.out.push(Fault::Unnamed { kind: k.clone() }),
            _ => {}
        }
        let bare = || {
            let title = o.get("fallback").and_then(|f| f.get("title")).and_then(Value::as_str);
            title.is_none_or(str::is_empty)
        };
        let app = self.app.contains(&k.as_str()) && !Block::KINDS.contains(&k.as_str());
        if (k == "island" || app) && bare() {
            let id = id.unwrap_or_default().into();
            self.out.push(Fault::Bare { kind: k.clone(), id });
        }
        if Block::KINDS.contains(&k.as_str()) {
            let scope = id.filter(|i| !i.is_empty()).unwrap_or(scope);
            let top = shallow(o);
            self.sends(&top, at, scope);
            self.core(&k, o, top);
            placed(o).for_each(|(p, c)| self.block(c, &format!("{at}/{p}"), scope));
        } else if !self.app.contains(&k.as_str()) {
            self.out.push(Fault::Unknown { kind: k });
        }
    }

    fn sends(&mut self, v: &Value, at: &str, scope: &str) {
        let inner = |x: &Value, k: &dyn std::fmt::Display| (x.is_object() || x.is_array()).then(|| format!("{at}/{k}"));
        match v {
            Value::Object(o) => {
                let links = LINKS.iter().filter_map(|k| o.get(*k).and_then(Value::as_str));
                let bad = links.filter(|u| !linkable(u)).map(|u| Fault::Link {
                    at: at.into(),
                    url: u.into(),
                });
                self.out.extend(bad.collect::<Vec<_>>());
                if let Some(a) = o.get("action").and_then(Value::as_str) {
                    let key = (scope.to_string(), a.to_string());
                    if let Some(first) = self.acts.insert(key, at.into()) {
                        self.out.push(Fault::ActTwice {
                            block: scope.into(),
                            action: a.into(),
                            at: [first, at.into()],
                        });
                    }
                }
                for (k, x) in o {
                    if let Some(p) = inner(x, k) {
                        self.sends(x, &p, scope);
                    }
                }
            }
            Value::Array(l) => {
                for (i, x) in l.iter().enumerate() {
                    if let Some(p) = inner(x, &i) {
                        self.sends(x, &p, scope);
                    }
                }
            }
            _ => {}
        }
    }

    fn core(&mut self, k: &str, o: &Fields, top: Value) {
        match serde_json::from_value::<Block>(top) {
            Err(e) => self.out.push(Fault::Shape {
                kind: k.into(),
                why: e.to_string(),
            }),
            Ok(b) => {
                let extra = b.more().into_iter().flat_map(Map::keys).filter(|f| *f != "fallback");
                let faults = extra.map(|f| Fault::Extra {
                    kind: k.into(),
                    field: f.clone(),
                });
                self.out.extend(faults.collect::<Vec<_>>());
                if let Block::Steps(s) = &b {
                    self.out.extend(unplaced(s).map(|why| Fault::Shape {
                        kind: k.into(),
                        why: why.into(),
                    }));
                }
            }
        }
        let chip = o.get("name").and_then(Value::as_str);
        let fields = o.get("fields").and_then(Value::as_array).into_iter().flatten();
        let names = fields.filter_map(|f| f.get("name").and_then(Value::as_str));
        match k {
            "chips" => self.keys.extend(chip.map(Into::into)),
            "form" | "config" => self.keys.extend(names.map(Into::into)),
            _ => {}
        }
    }
}

fn gets<'a>(v: &'a Value, out: &mut Vec<&'a str>) {
    match v {
        Value::Object(o) => match (o.len(), o.get("get").and_then(Value::as_str)) {
            (1, Some(k)) => out.push(k),
            _ => o.iter().filter(|(k, _)| *k != "calc").for_each(|(_, x)| gets(x, out)),
        },
        Value::Array(a) => a.iter().for_each(|x| gets(x, out)),
        _ => {}
    }
}

impl Built {
    /// A server's own screen, typed in; each block a client may not draw gets its fallback.
    pub fn of(screen: &Screen) -> Built {
        let mut v = serde_json::to_value(Block::Screen(Box::new(screen.clone()))).unwrap_or_default();
        write_fallbacks(&mut v);
        Built(v)
    }

    /// Another server's or a plugin's screen, read in as JSON.
    pub fn new(v: Value) -> Built {
        Built(v)
    }

    /// The screen as JSON.
    pub fn value(&self) -> &Value {
        &self.0
    }

    /// Every fault of the screen, given the app's own kinds.
    pub fn check(&self, app: &[&str]) -> Vec<Fault> {
        let mut w = Walk {
            app,
            ids: BTreeMap::new(),
            acts: BTreeMap::new(),
            keys: vec![],
            out: vec![],
        };
        let clash = app.iter().filter(|k| Block::KINDS.contains(k));
        w.out.extend(clash.map(|k| Fault::Clash { kind: (*k).into() }));
        let state = self.0.get("state").and_then(Value::as_object).into_iter().flatten();
        w.keys.extend(state.map(|(k, _)| k.clone()));
        w.block(&self.0, "", "");
        let mut declared = BTreeSet::new();
        let twice: Vec<String> = w
            .keys
            .iter()
            .filter(|k| !declared.insert(k.as_str()))
            .cloned()
            .collect();
        let mut used = vec![];
        gets(&self.0, &mut used);
        let undeclared = used.into_iter().filter(|k| !declared.contains(k)).map(String::from);
        let state: BTreeSet<String> = twice.into_iter().chain(undeclared).collect();
        w.out.extend(state.into_iter().map(|key| Fault::State { key }));
        w.out
    }
}
