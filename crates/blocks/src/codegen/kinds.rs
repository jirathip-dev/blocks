use std::path::Path;

use serde_json::Value;

use super::Files;
use crate::Block;

pub(super) fn files(root: &Path, _: &Value) -> std::io::Result<Files> {
    let drawn = drawn(root)?;
    let mut out = String::from("import type { Block, Kind } from \"./types.ts\";\n");
    if Block::KINDS.iter().any(|k| !drawn.contains(k)) {
        out.push_str("import { fallback } from \"../render/block.ts\";\n");
    }
    out.push_str("import type { Ctx } from \"../render/ctx.ts\";\n");
    for k in &drawn {
        out.push_str(&format!("import {{ {k} }} from \"../render/kind/{k}.ts\";\n"));
    }
    out.push_str(
        "\nexport type Of<K extends Kind> = Extract<Block, { type: K }>;\n\n\
         export const R: { [K in Kind]: (b: Of<K>, c: Ctx) => HTMLElement | null } = {\n",
    );
    for k in Block::KINDS {
        if drawn.contains(k) {
            out.push_str(&format!("  {k},\n"));
        } else {
            out.push_str(&format!("  {k}: fallback,\n"));
        }
    }
    let native = native(root)?.iter().map(|k| format!("\"{k}\"")).collect::<Vec<_>>();
    out.push_str(&format!(
        "}};\n\nexport const native: readonly Kind[] = [{}];\n",
        native.join(", ")
    ));
    Ok(vec![("web/src/gen/kinds.ts".into(), out)])
}

pub(super) fn native(root: &Path) -> std::io::Result<Vec<&'static str>> {
    let drawn = drawn(root)?;
    Ok(Block::KINDS
        .iter()
        .copied()
        .filter(|k| *k != "island" && drawn.contains(k))
        .collect())
}

fn drawn(root: &Path) -> std::io::Result<Vec<&'static str>> {
    let mut drawn = vec![];
    for f in std::fs::read_dir(root.join("web/src/render/kind"))? {
        let name = f?.file_name().to_string_lossy().into_owned();
        let Some(stem) = name.strip_suffix(".ts") else {
            continue;
        };
        let Some(k) = Block::KINDS.iter().copied().find(|k| *k == stem) else {
            return Err(std::io::Error::other(format!(
                "web/src/render/kind/{name} names no kind"
            )));
        };
        drawn.push(k);
    }
    drawn.sort_unstable();
    Ok(drawn)
}
