use std::path::Path;

use serde_json::Value;

use super::Files;

pub(super) fn files(_: &Path, s: &Value) -> std::io::Result<Files> {
    Ok(vec![(
        "schema/blocks.schema.json".into(),
        serde_json::to_string_pretty(s)? + "\n",
    )])
}

pub(super) enum Ty<'a> {
    Null,
    Str,
    Bool,
    Int(&'a str),
    Num,
    Json,
    List(Box<Ty<'a>>),
    Map(Box<Ty<'a>>),
    Named(&'a str),
}

pub(super) struct Prop<'a> {
    pub(super) name: &'a str,
    pub(super) ty: Ty<'a>,
    pub(super) opt: bool,
}

pub(super) enum Case<'a> {
    Ref(&'a str),
    Props(Vec<Prop<'a>>),
}

pub(super) enum Def<'a> {
    Struct(Vec<Prop<'a>>),
    Words(Vec<&'a str>),
    Tagged {
        tag: &'a str,
        cases: Vec<(&'a str, Case<'a>)>,
        rest: Option<&'a str>,
    },
    Union(Vec<Ty<'a>>),
    Keyed(Vec<(&'a str, Ty<'a>)>, Option<&'a str>),
}

pub(super) fn keyed(a: &Value) -> Option<(&str, &Value)> {
    let ps = a.get("properties")?.as_object()?;
    match (ps.iter().next(), a.get("additionalProperties")) {
        (Some((k, v)), Some(Value::Bool(false))) if ps.len() == 1 => Some((k.as_str(), v)),
        _ => None,
    }
}

pub(super) fn keyed_def(alts: &[Value]) -> Result<Option<Def<'_>>, String> {
    let (mut cases, mut rest) = (vec![], None);
    for a in alts {
        match (keyed(a), named(a)) {
            (Some((k, v)), _) => cases.push((k, ty(v)?.0)),
            (None, Some(n)) if rest.is_none() => rest = Some(n),
            _ => return Ok(None),
        }
    }
    Ok(Some(Def::Keyed(cases, rest)))
}

pub(super) type Out = Result<String, String>;

pub(super) fn alts(v: &Value) -> Option<&Vec<Value>> {
    v.get("oneOf").or_else(|| v.get("anyOf"))?.as_array()
}

pub(super) fn named(v: &Value) -> Option<&str> {
    v.get("$ref")?.as_str()?.strip_prefix("#/$defs/")
}

pub(super) fn ty(p: &Value) -> Result<(Ty<'_>, bool), String> {
    if p == &Value::Bool(true) {
        return Ok((Ty::Json, false));
    }
    if let Some(n) = named(p) {
        return Ok((Ty::Named(n), false));
    }
    if let Some([x, null]) = alts(p).map(Vec::as_slice) {
        if null.get("type").and_then(Value::as_str) == Some("null") {
            return Ok((ty(x)?.0, true));
        }
    }
    let types: Vec<&str> = match p.get("type") {
        Some(Value::String(t)) => vec![t],
        Some(Value::Array(ts)) => ts.iter().filter_map(Value::as_str).collect(),
        _ => return Err(format!("no generated type for {p}")),
    };
    let null = types.contains(&"null");
    let t = match types.iter().find(|t| **t != "null") {
        None if null => return Ok((Ty::Null, false)),
        Some(&"string") => Ty::Str,
        Some(&"boolean") => Ty::Bool,
        Some(&"number") => Ty::Num,
        Some(&"integer") => Ty::Int(p.get("format").and_then(Value::as_str).unwrap_or("")),
        Some(&"array") => Ty::List(Box::new(ty(p.get("items").ok_or("an array without items")?)?.0)),
        Some(&"object") => Ty::Map(Box::new(match p.get("additionalProperties") {
            Some(a @ Value::Object(_)) => ty(a)?.0,
            _ => Ty::Json,
        })),
        _ => return Err(format!("no generated type for {p}")),
    };
    Ok((t, null))
}

pub(super) fn props<'a>(o: &'a Value, skip: &str) -> Result<Vec<Prop<'a>>, String> {
    let req: Vec<&str> = o
        .get("required")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .collect();
    let all = o.get("properties").and_then(Value::as_object).into_iter().flatten();
    all.filter(|(k, _)| k.as_str() != skip)
        .map(|(k, v)| {
            let (ty, null) = ty(v)?;
            let opt = null || !req.contains(&k.as_str());
            Ok(Prop { name: k, ty, opt })
        })
        .collect()
}

pub(super) fn tag_of(alt: &Value) -> Option<(&str, &str)> {
    let ps = alt.get("properties")?.as_object()?;
    ps.iter()
        .find_map(|(k, v)| Some((k.as_str(), v.get("const")?.as_str()?)))
}

pub(super) fn def(v: &Value) -> Result<Def<'_>, String> {
    if let Some(words) = v.get("enum").and_then(Value::as_array) {
        return Ok(Def::Words(words.iter().filter_map(Value::as_str).collect()));
    }
    let Some(alts) = alts(v) else {
        return Ok(Def::Struct(props(v, "")?));
    };
    if let [w, s] = alts.as_slice() {
        if w.get("enum").is_some() && s.get("type").and_then(Value::as_str) == Some("string") {
            return def(w);
        }
    }
    let Some(tag) = alts.iter().find_map(tag_of).map(|t| t.0) else {
        if let Some(k) = keyed_def(alts)? {
            return Ok(k);
        }
        return Ok(Def::Union(
            alts.iter().map(|a| ty(a).map(|t| t.0)).collect::<Result<_, _>>()?,
        ));
    };
    let (mut cases, mut rest) = (vec![], None);
    for a in alts {
        match (tag_of(a), named(a)) {
            (Some((_, c)), Some(n)) => cases.push((c, Case::Ref(n))),
            (Some((_, c)), None) => cases.push((c, Case::Props(props(a, tag)?))),
            (None, Some(n)) => rest = Some(n),
            (None, None) => return Err(format!("an untagged case in {v}")),
        }
    }
    Ok(Def::Tagged { tag, cases, rest })
}

pub(super) fn defs(s: &Value) -> Result<Vec<(&str, Def<'_>)>, String> {
    let root = s.get("title").and_then(Value::as_str).map(|t| (t, s));
    let all = s.get("$defs").and_then(Value::as_object).into_iter().flatten();
    let all = all.filter(|(k, _)| root.is_none_or(|(t, _)| t != k.as_str()));
    root.into_iter()
        .chain(all.map(|(k, v)| (k.as_str(), v)))
        .map(|(k, v)| Ok((k, def(v)?)))
        .collect()
}

pub(super) fn camel(s: &str, upper: bool) -> String {
    let mut out = String::new();
    for (i, part) in s.split(['-', '_']).enumerate() {
        let mut cs = part.chars();
        if let Some(c) = cs.next() {
            let up = upper || i > 0;
            out.extend(if up {
                c.to_uppercase().collect::<Vec<_>>()
            } else {
                c.to_lowercase().collect()
            });
            out.extend(cs);
        }
    }
    out
}
