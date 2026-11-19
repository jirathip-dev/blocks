use std::collections::BTreeSet;
use std::path::Path;

use serde_json::{Map, Value};

use super::model::{alts, named, tag_of};
use super::ts::ts_defs;
use super::Files;

const KEEP: [&str; 15] = [
    "type",
    "$ref",
    "properties",
    "required",
    "anyOf",
    "oneOf",
    "items",
    "additionalProperties",
    "const",
    "enum",
    "minimum",
    "maximum",
    "minItems",
    "maxItems",
    "not",
];

pub(super) fn files(_: &Path, s: &Value) -> std::io::Result<Files> {
    let all = s.get("$defs").and_then(Value::as_object).cloned().unwrap_or_default();
    let mut seen = BTreeSet::new();
    let mut todo = vec!["Block".to_string()];
    while let Some(n) = todo.pop() {
        if let Some(d) = all.get(&n).filter(|_| seen.insert(n.clone())) {
            refs(d, &mut todo);
        }
    }
    let defs: Map<String, Value> = seen
        .iter()
        .filter_map(|n| Some((n.clone(), lean(all.get(n)?))))
        .collect();
    let cases = all.get("Block").and_then(alts).into_iter().flatten();
    let kinds: Map<String, Value> = cases
        .filter_map(|c| Some((tag_of(c)?.1.to_string(), Value::String(named(c)?.into()))))
        .collect();
    let fault = ts_defs(&schemars::schema_for!(crate::Fault).to_value()).map_err(std::io::Error::other)?;
    let ts = format!(
        "{}\nexport type Shape = boolean | {{ type?: string | string[]; $ref?: string; properties?: Record<string, Shape>; required?: string[]; anyOf?: Shape[]; oneOf?: Shape[]; items?: Shape; additionalProperties?: Shape; const?: unknown; enum?: unknown[]; not?: Shape; minimum?: number; maximum?: number; minItems?: number; maxItems?: number }};\n\nexport const kinds: Record<string, string> = {};\n\nexport const defs: Record<string, Shape> = {};\n",
        fault.trim_start(),
        serde_json::to_string_pretty(&kinds)?,
        serde_json::to_string_pretty(&defs)?
    );
    Ok(vec![("web/src/gen/shapes.ts".into(), ts)])
}

fn refs(v: &Value, out: &mut Vec<String>) {
    out.extend(named(v).map(String::from));
    match v {
        Value::Object(o) => o.values().for_each(|x| refs(x, out)),
        Value::Array(a) => a.iter().for_each(|x| refs(x, out)),
        _ => {}
    }
}

fn lean(v: &Value) -> Value {
    let Value::Object(o) = v else { return v.clone() };
    let keep = o.iter().filter(|(k, _)| KEEP.contains(&k.as_str()));
    let out = keep.map(|(k, x)| {
        let x = match (k.as_str(), x) {
            ("properties", Value::Object(ps)) => Value::Object(ps.iter().map(|(p, s)| (p.clone(), lean(s))).collect()),
            ("anyOf" | "oneOf", Value::Array(l)) => Value::Array(l.iter().map(lean).collect()),
            ("items" | "additionalProperties" | "not", s) => lean(s),
            (_, x) => x.clone(),
        };
        (k.clone(), x)
    });
    Value::Object(out.collect())
}
