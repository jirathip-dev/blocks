use std::path::Path;

use serde_json::Value;

use super::super::Files;

const DIR: &str = "crates/blocks/src/guard/rules";

pub(super) fn files(root: &Path, _: &Value) -> std::io::Result<Files> {
    let mut rules = vec![];
    for e in std::fs::read_dir(root.join(DIR))? {
        let path = e?.path();
        let stem = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or_default()
            .to_string();
        if path.extension().is_some_and(|x| x == "rs") && stem != "mod" {
            let checks = std::fs::read_to_string(&path)?.contains("pub(super) fn check(");
            rules.push((stem, checks));
        }
    }
    rules.sort();
    let mods: String = rules.iter().map(|(m, _)| format!("mod {m};\n")).collect();
    let all: String = rules.iter().map(|(m, _)| format!("    &{m}::RULE,\n")).collect();
    let checks: String = rules
        .iter()
        .filter(|(_, c)| *c)
        .map(|(m, _)| format!("    {m}::check,\n"))
        .collect();
    let text = format!(
        "{mods}\nuse crate::guard::cx::Cx;\nuse crate::guard::{{Rule, Seen}};\n\n\
         /// Every rule of the table, one file each in this folder.\n\
         pub static RULES: &[&Rule] = &[\n{all}];\n\n\
         pub(super) const CHECKS: &[fn(&Cx, &mut Vec<Seen>)] = &[\n{checks}];\n"
    );
    Ok(vec![(format!("{DIR}/mod.rs"), text)])
}
