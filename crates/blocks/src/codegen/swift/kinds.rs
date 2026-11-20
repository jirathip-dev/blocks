use std::path::Path;

use super::super::Files;
use crate::Block;

const DIR: &str = "swift/Sources/BlocksUI/Kind";

pub(in crate::codegen) fn files(root: &Path) -> std::io::Result<Files> {
    let mut drawn = vec![];
    for e in std::fs::read_dir(root.join(DIR))? {
        let name = e?.file_name().to_string_lossy().into_owned();
        let Some(view) = name.strip_suffix(".swift") else {
            continue;
        };
        let kind = view.to_lowercase();
        if Block::KINDS.contains(&kind.as_str()) {
            drawn.push(format!("        case .{kind}(let block): {view}Block(block: block)\n"));
        }
    }
    drawn.sort();
    let named: String = Block::KINDS
        .iter()
        .map(|k| format!("        case .{k}(let b): (\"{k}\", b.id)\n"))
        .collect();
    let text = format!(
        "import Blocks\nimport SwiftUI\n\nextension Block {{\n    internal var typeAndID: (type: String, id: String?) {{\n        switch self {{\n{named}        case .appBlock(let b): (b.type, b.id)\n        }}\n    }}\n}}\n\ninternal struct KindView: View {{\n    internal let block: Block\n\n    internal var body: some View {{\n        switch block {{\n{}        default: EmptyView()\n        }}\n    }}\n}}\n",
        drawn.concat()
    );
    Ok(vec![("swift/Sources/BlocksUI/Gen/Kinds.swift".into(), text)])
}
