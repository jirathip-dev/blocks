use std::path::Path;

use serde_json::Value;

use super::super::Files;

const DIR: &str = "crates/blocks/src/kind/core";

pub(super) fn files(root: &Path, _: &Value) -> std::io::Result<Files> {
    let mut mods = vec![];
    for e in std::fs::read_dir(root.join(DIR))? {
        let path = e?.path();
        let stem = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or_default()
            .to_string();
        if path.extension().is_none_or(|x| x != "rs") || stem == "mod" {
            continue;
        }
        let mut listed = listed(&std::fs::read_to_string(&path)?).ok_or_else(|| {
            std::io::Error::other(format!(
                "{DIR}/{stem}.rs has no `listed! {{ N: Kind(Type) = \"name\" }}`"
            ))
        })?;
        listed.sort_by_key(|(at, _)| *at);
        let kinds: Vec<String> = listed.iter().map(|(_, k)| k.clone()).collect();
        mods.push((listed.first().map(|(at, _)| *at), stem, kinds.join(", ")));
    }
    mods.sort();
    let list: String = mods.iter().map(|(_, m, k)| format!("    {m} {{ {k} }}\n")).collect();
    let text =
        format!("use serde::{{Deserialize, Serialize}};\n\nuse super::{{AppBlock, Fields}};\n\nkinds! {{\n{list}}}\n");
    Ok(vec![(format!("{DIR}/mod.rs"), text)])
}

fn listed(text: &str) -> Option<Vec<(u32, String)>> {
    let (_, rest) = text.split_once("listed! {")?;
    let (body, _) = rest.split_once('}')?;
    let mut quoted = false;
    body.split(|c| {
        quoted ^= c == '"';
        c == ',' && !quoted
    })
    .map(str::trim)
    .filter(|e| !e.is_empty())
    .map(|e| {
        let (at, kind) = e.split_once(':')?;
        Some((at.trim().parse().ok()?, kind.trim().to_string()))
    })
    .collect()
}
