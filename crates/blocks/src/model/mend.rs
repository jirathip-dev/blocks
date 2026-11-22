use std::collections::BTreeMap;

use serde_json::Value;

use crate::built::shallow;
use crate::catalog::{Catalog, NEVER};
use crate::kind::{Block, Fields};
use crate::model::{Mend, Wrong};

const HOT: [&str; 16] = [
    "action",
    "values",
    "confirm",
    "destructive",
    "url",
    "href",
    "link",
    "src",
    "avatar",
    "poster",
    "open",
    "sheet",
    "thread",
    "tap",
    "submit",
    "type",
];

fn inert(key: &str, v: &Value) -> bool {
    let hot = HOT.contains(&key) || (key == "style" && v == "destructive");
    !hot && match v {
        Value::Object(o) => o.iter().all(|(k, x)| inert(k, x)),
        Value::Array(l) => l.iter().all(|x| inert("", x)),
        _ => true,
    }
}

pub(super) struct Mender<'a> {
    pub(super) catalog: &'a Catalog,
    pub(super) prefix: &'a str,
    pub(super) n: usize,
    pub(super) places: BTreeMap<String, (String, String)>,
    pub(super) mends: Vec<Mend>,
    pub(super) faults: Vec<Wrong>,
}

impl Mender<'_> {
    pub(super) fn block(&mut self, v: &mut Value, at: &str) {
        let Value::Object(o) = v else {
            return self
                .faults
                .push(Wrong::new("lint/fault", at, "", "a block that is no object".into()));
        };
        let kind = o.get("type").and_then(Value::as_str).unwrap_or_default().to_string();
        let id = format!("{}.{}", self.prefix, self.n);
        self.n += 1;
        o.insert("id".into(), Value::String(id.clone()));
        self.places.insert(id, (at.into(), kind.clone()));
        if Block::KINDS.contains(&kind.as_str()) {
            self.fields(&kind, o, at);
        }
        self.names(&kind, o);
        let table = kind == "table";
        for key in ["blocks", "rows", "buttons"]
            .into_iter()
            .filter(|k| !table || *k != "rows")
        {
            for (i, c) in o
                .get_mut(key)
                .and_then(Value::as_array_mut)
                .into_iter()
                .flatten()
                .enumerate()
            {
                self.block(c, &format!("{at}.{key}[{i}]"));
            }
        }
        let rounds = o.get_mut("rounds").and_then(Value::as_array_mut).into_iter().flatten();
        for (r, round) in rounds.enumerate() {
            let list = round
                .get_mut("blocks")
                .and_then(Value::as_array_mut)
                .into_iter()
                .flatten();
            for (i, c) in list.enumerate() {
                self.block(c, &format!("{at}.rounds[{r}].blocks[{i}]"));
            }
        }
    }

    fn fields(&mut self, kind: &str, o: &mut Fields, at: &str) {
        let unknown: Vec<String> = match Block::read(kind, shallow(o)) {
            Ok(b) => b.more().into_iter().flat_map(|m| m.keys().cloned()).collect(),
            Err(e) => return self.faults.push(Wrong::new("lint/fault", at, kind, e.to_string())),
        };
        let fields = self.catalog.kinds.get(kind).and_then(|a| a.fields.as_ref());
        let unoffered = |k: &String| fields.is_some_and(|f| !f.contains(k)) && !NEVER.contains(&k.as_str());
        let out: Vec<String> = o
            .keys()
            .filter(|k| unknown.contains(k) || unoffered(k))
            .cloned()
            .collect();
        for field in out {
            match o.get(&field) {
                Some(v) if inert(&field, v) => {
                    drop(o.remove(&field));
                    self.mends.push(Mend::Dropped { at: at.into(), field });
                }
                _ if unknown.contains(&field) => {
                    let say = format!("`{field}` is no field of this kind; leave it out");
                    self.faults.push(Wrong::new("lint/fault", at, kind, say));
                }
                _ => {}
            }
        }
    }

    fn names(&self, kind: &str, o: &mut Fields) {
        let named: Vec<&mut Value> = match kind {
            "chips" => o.get_mut("name").into_iter().collect(),
            "form" | "config" => o
                .get_mut("fields")
                .and_then(Value::as_array_mut)
                .into_iter()
                .flatten()
                .filter_map(|f| f.get_mut("name"))
                .collect(),
            _ => vec![],
        };
        for n in named {
            if let Value::String(s) = n {
                *s = format!("{}.{s}", self.prefix);
            }
        }
    }
}
