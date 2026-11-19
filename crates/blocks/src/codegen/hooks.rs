use std::path::Path;

use serde_json::Value;

use super::model::{defs, Case, Def, Out};
use super::Files;
use crate::tree;

pub(super) fn files(_: &Path, s: &Value) -> std::io::Result<Files> {
    Ok(vec![(
        "web/src/gen/hooks.ts".into(),
        hooks(s).map_err(std::io::Error::other)?,
    )])
}

const PARTS: [&str; 5] = ["title", "subtitle", "badge", "value", "figure"];
const ACTIONS: [&str; 4] = ["actions", "buttons", "menu", "swipe"];

fn hooks(s: &Value) -> Out {
    let all = defs(s)?;
    let Some((_, Def::Tagged { cases, .. })) = all.iter().find(|(k, _)| *k == "Block") else {
        return Err("no Block in the schema".into());
    };
    let mut out = String::from(
        "import type { Kind } from \"./types.ts\";\n\nexport type Hook = { variant: string | null; parts: readonly string[] };\n\n\
         export const hooks: Record<Kind, Hook> = {\n",
    );
    for (kind, case) in cases {
        let Case::Ref(n) = case else { continue };
        let props = all.iter().find(|(k, _)| k == n).map(|(_, d)| d);
        let names: Vec<&str> = match props {
            Some(Def::Struct(ps)) => ps.iter().map(|p| p.name).collect(),
            _ => vec![],
        };
        let mut parts: Vec<&str> = PARTS.into_iter().filter(|p| names.contains(p)).collect();
        if ACTIONS.iter().any(|a| names.contains(a)) {
            parts.push("actions");
        }
        let variant = tree::VARIANTS
            .iter()
            .find(|(k, _)| k == kind)
            .map_or("null".into(), |(_, v)| format!("\"{v}\""));
        let parts = parts.iter().map(|p| format!("\"{p}\"")).collect::<Vec<_>>().join(", ");
        out.push_str(&format!("    {kind}: {{ variant: {variant}, parts: [{parts}] }},\n"));
    }
    let roles = tree::ROLES.map(|(k, r)| format!("{k}: \"{r}\""));
    let names = tree::NAMES.map(|n| format!("\"{n}\""));
    out.push_str(&format!(
        "}};\n\nexport const roles: Record<string, string> = {{ {} }};\n\nexport const names = [{}] as const;\n",
        roles.join(", "),
        names.join(", ")
    ));
    Ok(out)
}
