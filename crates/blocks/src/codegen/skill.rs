use std::path::Path;

use serde_json::Value;

use super::fixtures::tree_of;
use super::model::{camel, defs, Case, Def};
use super::Files;
use crate::{guard, Block, Built};

const DIR: &str = "skill/blocks";
const OK: &str = "fixtures/guard/ok";
const BIN: &str = "crates/blocks-cli/src/gen/skill.rs";

const HEAD: &str = "---\nname: blocks\ndescription: Build a blocks screen as data: the kinds and their fields, the guard's rules, and \
example screens that pass them. Use it when writing or changing a screen.\n---\n\n# blocks\n\n\
A screen is data: a `screen` or `sheet` block of typed blocks, checked, then drawn by a renderer. Start a new screen \
from a page in `examples/` (each has no guard finding), build it from the kinds below, keep it clear of the rules in \
`rules.md`, and check it with `blocks check`. Setting up and reading the guard: `docs/guard.md` in the blocks repo.\n\n\
## Kinds\n\n";

pub(super) fn files(root: &Path, s: &Value) -> std::io::Result<Files> {
    match std::fs::remove_dir_all(root.join(DIR)) {
        Err(e) if e.kind() != std::io::ErrorKind::NotFound => return Err(e),
        _ => {}
    }
    let mut out = kinds(s)?;
    out.push(("rules.md".into(), rules()));
    out.extend(examples(root)?);
    let list: String = out
        .iter()
        .map(|(p, _)| format!("    (\"{p}\", include_str!(\"../../../../{DIR}/{p}\")),\n"))
        .collect();
    let bin = format!("pub(crate) static FILES: &[(&str, &str)] = &[\n{list}];\n");
    let mut out: Files = out.into_iter().map(|(p, t)| (format!("{DIR}/{p}"), t)).collect();
    out.push((BIN.into(), bin));
    Ok(out)
}

fn kinds(s: &Value) -> std::io::Result<Files> {
    let all = defs(s).map_err(std::io::Error::other)?;
    let Some((_, Def::Tagged { cases, .. })) = all.iter().find(|(k, _)| *k == "Block") else {
        return Err(std::io::Error::other("no Block in the schema"));
    };
    let samples = crate::samples();
    let (mut index, mut out) = (String::from(HEAD), vec![]);
    for (kind, case) in cases {
        let Case::Ref(n) = case else { continue };
        let about = s
            .pointer(&format!("/$defs/{n}/description"))
            .and_then(Value::as_str)
            .unwrap_or_default();
        index.push_str(&format!("- [`{kind}`](kinds/{kind}.md): {about}\n"));
        let mut page = format!(
            "# `{kind}`\n\n{about}\n\nThe Rust type `{n}`; in TS, `{}(fields: {n})` from `web/src/gen/builders.ts`.\n\n\
             ## Fields\n\n| field | type | |\n|---|---|---|\n",
            camel(kind, false)
        );
        if let Some((_, Def::Struct(ps))) = all.iter().find(|(k, _)| k == n) {
            for p in ps {
                let need = if p.opt { "optional" } else { "required" };
                page.push_str(&format!("| `{}` | `{}` | {need} |\n", p.name, p.ty.ts()));
            }
        }
        if let Some((_, b)) = samples.iter().find(|(k, _)| k == kind) {
            let sample = serde_json::to_string_pretty(b)?;
            let tree = serde_json::to_string_pretty(&tree_of(b, Block::KINDS)?)?;
            page.push_str(&format!(
                "\n## A sample\n\n```json\n{sample}\n```\n\n## The tree it draws\n\n```json\n{tree}\n```\n"
            ));
        }
        out.push((format!("kinds/{kind}.md"), page));
    }
    index.push_str("\n## More\n\n- `rules.md`: every guard rule, what fires it and its fix\n- `examples/`: whole screens with no finding\n");
    out.insert(0, ("SKILL.md".into(), index));
    Ok(out)
}

fn rules() -> String {
    let mut out = format!(
        "# The guard's rules\n\nGuard version {}. A new error fails `blocks check`; a warning never fails.\n\n\
         | rule | severity | since | fires on | fix |\n|---|---|---|---|---|\n",
        guard::VERSION
    );
    for r in guard::RULES {
        let sev = if r.severity == guard::Severity::Error {
            "error"
        } else {
            "warn"
        };
        let cell = |t: &str| t.replace('|', "\\|");
        out.push_str(&format!(
            "| `{}` | {sev} | {} | {} | {} |\n",
            r.id,
            r.since,
            cell(r.what),
            cell(r.fix)
        ));
    }
    out
}

fn examples(root: &Path) -> std::io::Result<Files> {
    let mut names = vec![];
    for e in std::fs::read_dir(root.join(OK))? {
        let path = e?.path();
        if path.extension().is_some_and(|x| x == "json") {
            names.push(path);
        }
    }
    names.sort();
    let mut out = vec![];
    for path in names {
        let name = path.file_stem().and_then(|s| s.to_str()).unwrap_or_default();
        let screen = Built::new(serde_json::from_str(&std::fs::read_to_string(&path)?)?);
        let page = guard::example(name, &screen, &[]).map_err(|seen| {
            let found: Vec<String> = seen.iter().map(|s| format!("{} at {}", s.rule, s.at)).collect();
            std::io::Error::other(format!(
                "{OK}/{name}.json: an example with a finding: {}",
                found.join(", ")
            ))
        })?;
        out.push((format!("examples/{name}.md"), page));
    }
    Ok(out)
}
