use std::path::Path;

use super::super::Files;
use crate::Block;

const DIR: &str = "crates/blocks/src/site/kind";

pub(super) fn files(root: &Path) -> std::io::Result<Files> {
    let mut drawn = vec![];
    for e in std::fs::read_dir(root.join(DIR))? {
        let name = e?.file_name().to_string_lossy().into_owned();
        if let Some(kind) = name.strip_suffix(".rs").filter(|k| Block::KINDS.contains(k)) {
            drawn.push(format!("    \"{kind}\" => {kind},\n"));
        }
    }
    drawn.sort();
    Ok(vec![(
        format!("{DIR}/drawn.rs"),
        format!("kinds! {{\n{}}}\n", drawn.concat()),
    )])
}
