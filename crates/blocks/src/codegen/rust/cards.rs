use std::collections::{BTreeMap, BTreeSet};
use std::path::Path;

use serde_json::Value;

use super::super::model::{about, alts, named};
use super::super::Files;

const OUT: &str = "crates/blocks/src/catalog/cards.rs";
const HIDDEN: &[&str] = &[
    "fallback", "show", "enabled", "checks", "set", "focus", "keep", "open", "sheet", "thread",
];
const UNNAMED: &[&str] = &["Block", "Bound", "Expr"];

struct Gen<'a> {
    defs: &'a Value,
    kinds: Vec<(&'a str, &'a str)>,
}

fn json(v: &Value) -> String {
    serde_json::to_string(v).unwrap_or_default()
}

fn words(v: &Value) -> Option<&Vec<Value>> {
    if let Some([w, s]) = alts(v).map(Vec::as_slice) {
        if s.get("type").and_then(Value::as_str) == Some("string") {
            return w.get("enum")?.as_array();
        }
    }
    v.get("enum")?.as_array()
}

fn join(ws: &[Value], by: &str) -> String {
    ws.iter().map(json).collect::<Vec<_>>().join(by)
}

fn tagged(v: &Value) -> Vec<(&str, &str)> {
    alts(v)
        .into_iter()
        .flatten()
        .filter_map(|a| Some((a.pointer("/properties/type/const")?.as_str()?, named(a)?)))
        .collect()
}

fn slots<'v>(v: &'v Value, skip: &[&str]) -> Vec<(&'v str, bool, &'v Value)> {
    let need: Vec<&str> = v
        .get("required")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .collect();
    let props = v.get("properties").and_then(Value::as_object).into_iter().flatten();
    let mut out: Vec<_> = props
        .filter(|(k, _)| !skip.contains(&k.as_str()))
        .map(|(k, p)| (k.as_str(), need.contains(&k.as_str()), p))
        .collect();
    out.sort_by_key(|(k, need, _)| (!need, *k));
    out
}

impl Gen<'_> {
    fn def(&self, name: &str) -> &Value {
        self.defs.get(name).unwrap_or(&Value::Null)
    }

    fn ty(&self, v: &Value, refs: &mut BTreeSet<String>) -> String {
        if v == &Value::Bool(true) {
            return "any".into();
        }
        if let Some(name) = named(v) {
            if let Some(w) = words(self.def(name)).filter(|w| w.len() <= 4) {
                return join(w, "|");
            }
            refs.insert(name.into());
            return name.into();
        }
        if let Some(alts) = alts(v) {
            let not_null = alts
                .iter()
                .filter(|a| a.get("type").and_then(Value::as_str) != Some("null"));
            return not_null.map(|a| self.ty(a, refs)).collect::<Vec<_>>().join("|");
        }
        if let Some(c) = v.get("const") {
            return json(c);
        }
        if let Some(e) = v.get("enum").and_then(Value::as_array) {
            return join(e, "|");
        }
        let t = match v.get("type") {
            Some(Value::Array(ts)) => ts.iter().filter_map(Value::as_str).find(|t| *t != "null"),
            t => t.and_then(Value::as_str),
        };
        match t {
            Some("array") => {
                let item = self.ty(v.get("items").unwrap_or(&Value::Bool(true)), refs);
                if item.contains('|') {
                    format!("({item})[]")
                } else {
                    item + "[]"
                }
            }
            Some("object") if v.get("properties").is_some() => self.obj(v, refs, HIDDEN, ""),
            Some("object") => "{}".into(),
            Some("string") => "string".into(),
            Some("boolean") => "bool".into(),
            Some("number" | "integer") => "number".into(),
            _ => "any".into(),
        }
    }

    fn obj(&self, v: &Value, refs: &mut BTreeSet<String>, skip: &[&str], head: &str) -> String {
        let fields: Vec<String> = slots(v, skip)
            .into_iter()
            .map(|(k, need, p)| format!("{k}{}: {}", if need { "" } else { "?" }, self.ty(p, refs)))
            .collect();
        format!("{{{head}{}}}", fields.join(", "))
    }

    fn part(&self, name: &str, refs: &mut BTreeSet<String>) -> String {
        let v = self.def(name);
        if let Some(w) = words(v) {
            return join(w, "|");
        }
        if let Some((input, _)) = tagged(self.def("Field")).into_iter().find(|(_, n)| *n == name) {
            return self.obj(v, refs, HIDDEN, &format!("type: {input:?}, "));
        }
        match alts(v) {
            Some(alts) if v.get("properties").is_none() => {
                let tys = alts.iter().map(|a| self.ty(a, refs)).filter(|t| t != "Bound");
                tys.collect::<Vec<_>>().join(" | ")
            }
            _ => self.obj(v, refs, HIDDEN, ""),
        }
    }

    fn names(&self, refs: &BTreeSet<String>) -> Vec<String> {
        let shown = refs.iter().filter(|n| !self.kinds.iter().any(|(_, d)| d == n));
        shown.filter(|n| !UNNAMED.contains(&n.as_str())).cloned().collect()
    }

    fn sends(&self, name: &str, refs: &BTreeSet<String>) -> bool {
        name == "action" || refs.iter().any(|n| self.def(n).pointer("/properties/action").is_some())
    }
}

pub(super) fn files(_: &Path, s: &Value) -> std::io::Result<Files> {
    let defs = s
        .get("$defs")
        .ok_or_else(|| std::io::Error::other("no $defs in the schema"))?;
    let g = Gen {
        defs,
        kinds: tagged(defs.get("Block").unwrap_or(&Value::Null)),
    };
    let mut out =
        String::from("use super::{Card, Part, Slot};\n\n#[rustfmt::skip]\npub(crate) static KINDS: &[Card] = &[\n");
    let mut todo: Vec<String> = tagged(g.def("Field")).into_iter().map(|(_, n)| n.into()).collect();
    for (kind, def) in &g.kinds {
        let v = g.def(def);
        let about = about(s, kind).split([':', ';']).next().unwrap_or_default();
        out.push_str(&format!("    Card {{ kind: {kind:?}, about: {about:?}, fields: &[\n"));
        let mut skip = vec!["type", "id"];
        skip.extend(HIDDEN);
        let prose = [("markdown", true, &Value::Null)];
        let slots = if *kind == "prose" {
            prose.to_vec()
        } else {
            slots(v, &skip)
        };
        for (name, need, p) in slots {
            let mut refs = BTreeSet::new();
            let ty = if *kind == "prose" {
                "string".into()
            } else {
                g.ty(p, &mut refs)
            };
            let (names, sends) = (g.names(&refs), g.sends(name, &refs));
            out.push_str(&format!(
                "        Slot {{ name: {name:?}, ty: {ty:?}, need: {need}, names: &{names:?}, sends: {sends} }},\n"
            ));
            todo.extend(names);
        }
        out.push_str("    ] },\n");
    }
    out.push_str("];\n\n#[rustfmt::skip]\npub(crate) static PARTS: &[Part] = &[\n");
    let mut parts = BTreeMap::new();
    while let Some(name) = todo.pop() {
        if name == "Field" || parts.contains_key(&name) {
            continue;
        }
        let mut refs = BTreeSet::new();
        let line = g.part(&name, &mut refs);
        let names = g.names(&refs);
        todo.extend(names.iter().cloned());
        let input = tagged(g.def("Field"))
            .into_iter()
            .find(|(_, n)| *n == name)
            .map_or("", |(i, _)| i);
        parts.insert(name, (input, line, names));
    }
    for (name, (input, line, names)) in parts {
        out.push_str(&format!(
            "    Part {{ name: {name:?}, input: {input:?}, line: {line:?}, names: &{names:?} }},\n"
        ));
    }
    out.push_str("];\n");
    Ok(vec![(OUT.into(), out)])
}
