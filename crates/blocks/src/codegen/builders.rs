use std::path::Path;

use serde_json::Value;

use super::model::{camel, defs, Case, Def, Ty};
use super::Files;

pub(super) fn files(_: &Path, s: &Value) -> std::io::Result<Files> {
    let ts = builders(s).map_err(std::io::Error::other)?;
    Ok(vec![("web/src/gen/builders.ts".into(), ts)])
}

fn builders(s: &Value) -> Result<String, String> {
    let all = defs(s)?;
    let find = |name: &str| all.iter().find(|(n, _)| *n == name).map(|(_, d)| d);
    let Some(Def::Tagged { cases, .. }) = find("Block") else {
        return Err("no tagged Block in the schema".into());
    };
    let Some(Def::Keyed(ops, _)) = find("Expr") else {
        return Err("no keyed Expr in the schema".into());
    };
    let mut names: Vec<&str> = vec!["Block", "Expr", "Kind"];
    let mut out = String::new();
    for (kind, case) in cases {
        let Case::Ref(n) = case else {
            return Err(format!("the `{kind}` kind has no named type"));
        };
        names.push(n);
        let f = camel(kind, false);
        out.push_str(&format!(
            "export const {f} = (fields: {n}): Of<\"{kind}\"> => ({{ type: \"{kind}\", ...fields }});\n"
        ));
    }
    out.push_str("\nexport const expr = {\n");
    for (op, t) in ops {
        let arg = match t {
            Ty::List(t) => format!("...v: {}[]", t.ts()),
            t => format!("v: {}", t.ts()),
        };
        names.extend(named(t));
        out.push_str(&format!("  {op}: ({arg}): Expr => ({{ {op}: v }}),\n"));
    }
    names.sort_unstable();
    names.dedup();
    Ok(format!(
        "import type {{ {} }} from \"./types.ts\";\n\nexport type Of<K extends Kind> = Extract<Block, {{ type: K }}>;\n\n{out}}};\n",
        names.join(", ")
    ))
}

fn named<'a>(t: &Ty<'a>) -> Option<&'a str> {
    match t {
        Ty::Named(n) => Some(n),
        Ty::List(t) => named(t),
        _ => None,
    }
}
