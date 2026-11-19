use std::path::Path;

use serde_json::Value;

use super::model::{defs, Case, Def, Out, Prop, Ty};
use super::Files;
use crate::{layout, Block, SCHEMA_VERSION};

pub(super) fn files(_: &Path, s: &Value) -> std::io::Result<Files> {
    Ok(vec![
        ("web/src/gen/types.ts".into(), ts(s).map_err(std::io::Error::other)?),
        (
            "web/src/gen/layout.ts".into(),
            layout_ts().map_err(std::io::Error::other)?,
        ),
    ])
}

impl Ty<'_> {
    fn ts(&self) -> String {
        match self {
            Self::Null => "null".into(),
            Self::Str => "string".into(),
            Self::Bool => "boolean".into(),
            Self::Int(_) | Self::Num => "number".into(),
            Self::Json => "unknown".into(),
            Self::List(t) => format!("{}[]", t.ts()),
            Self::Map(t) => format!("Record<string, {}>", t.ts()),
            Self::Named(n) => (*n).into(),
        }
    }
}

fn ts_props(ps: &[Prop<'_>], tag: Option<String>) -> String {
    let fs = ps.iter().map(|p| {
        let (q, null) = if p.opt { ("?", " | null") } else { ("", "") };
        format!("{}{q}: {}{null}", p.name, p.ty.ts())
    });
    format!(
        "{{ {} }}",
        tag.into_iter().chain(fs).collect::<Vec<String>>().join("; ")
    )
}

fn ts(s: &Value) -> Out {
    let mut out = format!("export const schemaVersion = {SCHEMA_VERSION};\n") + &ts_defs(s)?;
    let kinds = Block::KINDS
        .iter()
        .map(|k| format!("\"{k}\""))
        .collect::<Vec<_>>()
        .join(" | ");
    out.push_str(&format!("\nexport type Kind = {kinds};\n"));
    Ok(out)
}

fn ts_defs(s: &Value) -> Out {
    let mut out = String::new();
    for (name, d) in defs(s)? {
        let body = match &d {
            Def::Struct(ps) => ts_props(ps, None),
            Def::Words(ws) => ws.iter().map(|w| format!("\"{w}\"")).collect::<Vec<_>>().join(" | "),
            Def::Union(ts) => ts.iter().map(Ty::ts).collect::<Vec<_>>().join(" | "),
            Def::Keyed(cases, rest) => {
                let cases = cases.iter().map(|(k, t)| format!("{{ {k}: {} }}", t.ts()));
                cases.chain(rest.map(String::from)).collect::<Vec<_>>().join(" | ")
            }
            Def::Tagged { tag, cases, rest } => {
                let case = |(c, p): &(&str, Case<'_>)| match p {
                    Case::Ref(n) => format!("({{ {tag}: \"{c}\" }} & {n})"),
                    Case::Props(ps) => ts_props(ps, Some(format!("{tag}: \"{c}\""))),
                };
                let rest = rest.map(|r| format!("({r} & {{ [key: string]: unknown }})"));
                cases.iter().map(case).chain(rest).collect::<Vec<_>>().join(" | ")
            }
        };
        out.push_str(&format!("\nexport type {name} = {body};\n"));
    }
    Ok(out)
}

fn layout_ts() -> Out {
    let place = ts_defs(&schemars::schema_for!(layout::Place).to_value())?;
    Ok(place + &ts_defs(&schemars::schema_for!(layout::Transition).to_value())?)
}
