use std::io::Write as _;

use blocks::Block;

const TEMPLATES: [(&str, &str); 5] = [
    (
        "crates/blocks/src/kind/core/{{name}}.rs",
        include_str!("../templates/kind/kind.rs"),
    ),
    (
        "crates/blocks/src/site/kind/{{name}}.rs",
        include_str!("../templates/kind/site.rs"),
    ),
    (
        "web/src/render/kind/{{name}}.ts",
        include_str!("../templates/kind/render.ts"),
    ),
    (
        "web/src/css/kind/{{name}}.css",
        include_str!("../templates/kind/kind.css"),
    ),
    (
        "swift/Sources/BlocksUI/Kind/{{Name}}.swift",
        include_str!("../templates/kind/Kind.swift"),
    ),
];
const STRESS: &str = "fixtures/stress/table.json";

pub(crate) fn run(args: &[String]) -> Result<bool, String> {
    let [what, name] = args else {
        return Err(crate::USAGE.into());
    };
    if what != "kind" {
        return Err(format!("{what}: not `kind`; {}", crate::USAGE));
    }
    let mut chars = name.chars();
    let first = chars.next().filter(char::is_ascii_lowercase);
    let Some(first) = first.filter(|_| chars.as_str().chars().all(|c| c.is_ascii_lowercase())) else {
        return Err(format!("{name}: a kind's name is lowercase letters a-z"));
    };
    if Block::KINDS.contains(&name.as_str()) {
        return Err(format!("{name}: a core kind already"));
    }
    let fill = |t: &str| {
        t.replace("{{name}}", name)
            .replace("{{Name}}", &format!("{}{}", first.to_ascii_uppercase(), chars.as_str()))
            .replace("{{at}}", &Block::KINDS.len().to_string())
    };
    let files: Vec<(String, String)> = TEMPLATES.iter().map(|(p, t)| (fill(p), fill(t))).collect();
    for (path, _) in &files {
        let dir = std::path::Path::new(path).parent().filter(|d| d.is_dir());
        if dir.is_none() {
            return Err(format!(
                "{path}: no such folder; run `blocks new` at the blocks repo's top"
            ));
        }
        if std::path::Path::new(path).exists() {
            return Err(format!("{path}: exists already"));
        }
    }
    let table = std::fs::read_to_string(STRESS).map_err(|e| format!("{STRESS}: {e}"))?;
    let table = stressed(&table, name, &fill(include_str!("../templates/kind/stress.json")))
        .ok_or_else(|| format!("{STRESS}: not one row a line, or a row for {name} already"))?;
    for (path, text) in &files {
        std::fs::write(path, text).map_err(|e| format!("{path}: {e}"))?;
        writeln!(std::io::stdout(), "{path}").map_err(|e| e.to_string())?;
    }
    std::fs::write(STRESS, table).map_err(|e| format!("{STRESS}: {e}"))?;
    writeln!(std::io::stdout(), "{STRESS}").map_err(|e| e.to_string())?;
    Ok(true)
}

fn stressed(table: &str, name: &str, row: &str) -> Option<String> {
    let mut lines: Vec<String> = table.lines().map(str::to_string).collect();
    let rows = lines.len().checked_sub(1)?;
    let key = |l: &String| l.strip_prefix("  \"")?.split_once('"').map(|(k, _)| k.to_string());
    let keys: Vec<String> = lines.get(1..rows)?.iter().map(key).collect::<Option<_>>()?;
    if keys.iter().any(|k| k == name) {
        return None;
    }
    let row = row.trim_end();
    if let Some(at) = keys.iter().position(|k| k.as_str() > name) {
        lines.insert(at + 1, format!("{row},"));
    } else {
        lines.get_mut(rows - 1)?.push(',');
        lines.insert(rows, row.into());
    }
    Some(lines.join("\n") + "\n")
}
