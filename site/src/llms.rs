use std::fs;
use std::path::Path;

use blocks::Block;
use serde_json::Value;

use crate::kinds::{about, samples};
use crate::play;
use crate::ui::REPO;
use crate::BASE;

/// The field table of a kind's skill page, which `just gen` writes from the schema.
pub fn fields(root: &Path, kind: &str) -> Result<String, String> {
    let file = format!("skill/blocks/kinds/{kind}.md");
    let page = fs::read_to_string(root.join(&file)).map_err(|e| format!("{file}: {e}"))?;
    let (_, rest) = page
        .split_once("## Fields\n\n")
        .ok_or_else(|| format!("{file}: no fields"))?;
    Ok(rest.split("\n## ").next().unwrap_or(rest).trim_end().to_string())
}

/// A kind page's markdown twin: its summary, its sample's Rust and JSON, and its fields.
pub fn kind(kind: &str, sample: &[Block], fields: &str) -> String {
    let rust: String = play::cuts(sample)
        .iter()
        .map(|c| {
            format!(
                "[{}:{}–{}]({})\n\n```rust\n{}\n```\n\n",
                c.file,
                c.from,
                c.to,
                play::source_url(c),
                c.code
            )
        })
        .collect();
    let json = play::json(&play::screen(kind, sample));
    format!(
        "# `{kind}`\n\n{}\n\nDrawn: {BASE}kind-{kind}.html\n\n## Rust\n\n{rust}## JSON\n\n```json\n{json}\n```\n\n## Fields\n\n{fields}\n",
        about(kind)
    )
}

fn examples(root: &Path) -> Result<String, String> {
    let dir = root.join("fixtures/guard/ok");
    let mut names: Vec<String> = fs::read_dir(&dir)
        .map_err(|e| format!("{}: {e}", dir.display()))?
        .filter_map(|f| f.ok()?.file_name().into_string().ok())
        .filter_map(|f| f.strip_suffix(".json").map(String::from))
        .collect();
    names.sort();
    let mut out = String::new();
    for name in names {
        let text = fs::read_to_string(dir.join(format!("{name}.json"))).map_err(|e| format!("{name}: {e}"))?;
        let screen: Value = serde_json::from_str(&text).map_err(|e| format!("{name}: {e}"))?;
        let field = |k: &str| screen.get(k).and_then(Value::as_str).unwrap_or_default().to_string();
        out.push_str(&format!(
            "- [{name}]({REPO}/blob/main/skill/blocks/examples/{name}.md): a {} titled \"{}\" with no guard finding\n",
            field("type"),
            field("title")
        ));
    }
    Ok(out)
}

/// The site's `llms.txt`: what blocks is, then the skill, each kind's markdown, the theme and guard docs and the examples.
pub fn index(root: &Path) -> Result<String, String> {
    let kinds: String = samples()
        .iter()
        .map(|(k, _)| format!("- [{k}]({BASE}kind-{k}.md): {}\n", about(k)))
        .collect();
    Ok(format!(
        "# blocks\n\n> Typed screens, drawn the same on the web, in SwiftUI and as a static page.\n\n\
         An app builds a screen from typed blocks (rows, stats, forms, prose) in Rust; a server sends it once as JSON, then only what changed. \
         Each renderer draws the same tree, and every block carries a fallback for a renderer that lacks its kind.\n\n\
         ## Docs\n\n\
         - [Skill]({REPO}/blob/main/skill/blocks/SKILL.md): build a screen as data: the kinds and their fields, the guard's rules and examples\n\
         - [Theme]({REPO}/blob/main/docs/theme.md): the colour tokens, the gate and the built-in default look\n\
         - [Guard]({REPO}/blob/main/docs/guard.md): `blocks check`, the lint over an app's screens, its rules and baselines\n\n\
         ## Kinds\n\n{kinds}\n## Examples\n\n{}",
        examples(root)?
    ))
}
