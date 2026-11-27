use std::path::Path;

use serde_json::Value;

use super::super::Files;

const DIR: &str = "crates/blocks/src/theme/axis";

pub(super) fn files(root: &Path, _: &Value) -> std::io::Result<Files> {
    let style = std::fs::read_to_string(root.join("crates/blocks/src/theme/style.rs"))?;
    let mut axes = vec![];
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
        let at = style
            .find(&format!("    pub {stem}: "))
            .ok_or_else(|| std::io::Error::other(format!("{DIR}/{stem}.rs names no field of Style")))?;
        axes.push((at, stem));
    }
    axes.sort();
    let mut mods: Vec<&str> = axes.iter().map(|(_, m)| m.as_str()).collect();
    let list = mods.iter().map(|m| format!("{m}::AXIS")).collect::<Vec<_>>().join(", ");
    mods.sort_unstable();
    let mods: String = mods.iter().map(|m| format!("pub(super) mod {m};\n")).collect();
    let text = format!(
        "use super::Axis;\n\n{mods}\n/// Every axis that restyles a part, in the order `Style` lists them.\npub const AXES: [Axis; {}] = [{list}];\n",
        axes.len()
    );
    Ok(vec![(format!("{DIR}/mod.rs"), text)])
}
