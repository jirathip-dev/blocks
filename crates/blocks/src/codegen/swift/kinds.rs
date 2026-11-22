use std::path::Path;

use serde_json::Value;

use super::super::model::{defs, kinds, Prop, Ty};
use super::super::Files;
use crate::{patch, tree, Block};

const DIR: &str = "swift/Sources/BlocksUI/Kind";
const WATCH_OFF: &str = "#if !os(watchOS)";

pub(in crate::codegen) fn files(root: &Path, s: &Value) -> std::io::Result<Files> {
    let (mut drawn, mut off, mut seen) = (vec![], vec![], vec![]);
    for e in std::fs::read_dir(root.join(DIR))? {
        let e = e?;
        let name = e.file_name().to_string_lossy().into_owned();
        let Some(view) = name.strip_suffix(".swift") else {
            continue;
        };
        let kind = view.to_lowercase();
        if Block::KINDS.contains(&kind.as_str()) {
            let line = format!("        case .{kind}(let block): {view}Block(block: block)\n");
            if std::fs::read_to_string(e.path())?.starts_with(WATCH_OFF) {
                off.push(format!("    {line}"));
            } else {
                drawn.push(line);
            }
            seen.push(kind);
        }
    }
    if let Some(kind) = Block::KINDS.iter().find(|k| !seen.iter().any(|s| s == *k)) {
        return Err(std::io::Error::other(format!("{DIR}: no file draws the {kind} kind")));
    }
    drawn.sort();
    off.sort();
    let off = if off.is_empty() {
        String::new()
    } else {
        format!(
            "        {WATCH_OFF}\n{}        #else\n            default: EmptyView()\n        #endif\n",
            off.concat()
        )
    };
    let named: String = Block::KINDS
        .iter()
        .map(|k| format!("        case .{k}(let b): (\"{k}\", b.id)\n"))
        .collect();
    let facts = facts(s).map_err(std::io::Error::other)?;
    let text = format!(
        "import Blocks\nimport SwiftUI\n\nextension Block {{\n    internal var typeAndID: (type: String, id: String?) {{\n        switch self {{\n{named}        case .appBlock(let b): (b.type, b.id)\n        }}\n    }}\n{facts}}}\n\ninternal struct KindView: View {{\n    internal let block: Block\n\n    internal var body: some View {{\n        switch block {{\n{}        case .appBlock(let block): AppBlockView(block: block)\n{off}        }}\n    }}\n}}\n",
        drawn.concat()
    );
    let hosts = patch::HOSTS.map(|(k, l)| format!("\"{k}\": \"{l}\""));
    let walked = patch::WALKED.map(|l| format!("\"{l}\""));
    let lists = format!(
        "extension Block {{\n    package static let hosts: [String: String] = [{}]\n    package static let walked = [{}]\n}}\n",
        hosts.join(", "),
        walked.join(", ")
    );
    Ok(vec![
        ("swift/Sources/BlocksUI/Gen/Kinds.swift".into(), text),
        ("swift/Sources/Blocks/Gen/Kinds.swift".into(), lists),
    ])
}

fn facts(s: &Value) -> Result<String, String> {
    let all = defs(s)?;
    let (mut variant, mut source, mut labels) = (String::new(), String::new(), String::new());
    for (kind, props) in kinds(&all)? {
        let prop = |n: &str| props.iter().find(|p| p.name == n);
        let field = tree::VARIANTS
            .iter()
            .find(|(k, _)| *k == kind)
            .and_then(|(_, f)| prop(f));
        if let Some(p) = field {
            let raw = match (&p.ty, p.opt) {
                (Ty::Named(_), true) => "?.rawValue",
                (Ty::Named(_), false) => ".rawValue",
                _ => "",
            };
            variant.push_str(&format!("        case .{kind}(let b): b.{}{raw}\n", p.name));
        }
        let has = |n: &str, ok: fn(&Prop) -> bool| prop(n).is_some_and(ok);
        let sent: Vec<String> = [
            ("action", has("action", is_str)),
            ("tap", has("tap", is_tap)),
            ("values", has("values", is_map)),
        ]
        .into_iter()
        .filter(|(_, h)| *h)
        .map(|(n, _)| format!("{n}: b.{n}"))
        .collect();
        if !sent.is_empty() {
            source.push_str(&format!("        case .{kind}(let b): Source({})\n", sent.join(", ")));
        }
        let names: Vec<String> = tree::NAMES
            .iter()
            .filter(|n| prop(n).is_some_and(is_str))
            .map(|n| format!("b.{n}"))
            .collect();
        if !names.is_empty() {
            labels.push_str(&format!("        case .{kind}(let b): [{}]\n", names.join(", ")));
        }
    }
    let roles = tree::ROLES.map(|(k, r)| format!("\"{k}\": \"{r}\""));
    let names = tree::NAMES.map(|n| format!("\"{n}\""));
    Ok(format!(
        "\n    internal var variant: String? {{\n        switch self {{\n{variant}        default: nil\n        }}\n    }}\n\n\
         \x20   internal var source: Source {{\n        switch self {{\n{source}        default: Source()\n        }}\n    }}\n\n\
         \x20   internal var named: [String?] {{\n        switch self {{\n{labels}        default: []\n        }}\n    }}\n\n\
         \x20   internal static let roles = [{}]\n    internal static let names = [{}]\n",
        roles.join(", "),
        names.join(", ")
    ))
}

fn is_str(p: &Prop) -> bool {
    matches!(p.ty, Ty::Str)
}

fn is_tap(p: &Prop) -> bool {
    matches!(p.ty, Ty::Named("Tap"))
}

fn is_map(p: &Prop) -> bool {
    matches!(p.ty, Ty::Map(_))
}
