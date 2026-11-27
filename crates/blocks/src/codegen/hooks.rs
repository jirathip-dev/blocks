use std::path::Path;

use serde_json::Value;

use super::model::{defs, kinds, Out};
use super::Files;
use crate::{patch, theme, tree};

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
    let mut out = String::from(
        "import type { Kind } from \"./types.ts\";\n\nexport type Hook = { variant: string | null; parts: readonly string[] };\n\n\
         export const hooks: Record<Kind, Hook> = {\n",
    );
    for (kind, props) in kinds(&all)? {
        let names: Vec<&str> = props.iter().map(|p| p.name).collect();
        let mut parts: Vec<&str> = PARTS.into_iter().filter(|p| names.contains(p)).collect();
        if ACTIONS.iter().any(|a| names.contains(a)) {
            parts.push("actions");
        }
        let variant = tree::VARIANTS
            .iter()
            .find(|(k, _)| *k == kind)
            .map_or("null".into(), |(_, v)| format!("\"{v}\""));
        let parts = parts.iter().map(|p| format!("\"{p}\"")).collect::<Vec<_>>().join(", ");
        out.push_str(&format!("    {kind}: {{ variant: {variant}, parts: [{parts}] }},\n"));
    }
    let roles = tree::ROLES.map(|(k, r)| format!("{k}: \"{r}\""));
    let names = tree::NAMES.map(|n| format!("\"{n}\""));
    let hosts = patch::HOSTS.map(|(k, l)| format!("{k}: \"{l}\""));
    let walked = patch::WALKED.map(|l| format!("\"{l}\""));
    out.push_str(&format!(
        "}};\n\nexport const roles: Record<string, string> = {{ {} }};\n\nexport const names = [{}] as const;\n\n\
         export const hosts: Record<string, string> = {{ {} }};\n\nexport const walked = [{}] as const;\n\nexport const finishes = [{}] as const;\n",
        roles.join(", "),
        names.join(", "),
        hosts.join(", "),
        walked.join(", "),
        theme::Finish::ALL.map(|f| format!("\"{}\"", f.name())).join(", ")
    ));
    Ok(out)
}
