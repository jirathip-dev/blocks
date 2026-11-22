use std::path::Path;

use serde_json::Value;

use super::Files;

mod cards;
mod kinds;
mod rules;
mod site;

pub(super) fn files(root: &Path, s: &Value) -> std::io::Result<Files> {
    let mut out = rules::files(root, s)?;
    out.extend(kinds::files(root, s)?);
    out.extend(site::files(root)?);
    out.extend(cards::files(root, s)?);
    Ok(out)
}

/// Writes only the Rust kind list, so the next build's codegen knows a kind just added.
pub fn kinds(root: &Path) -> std::io::Result<()> {
    for (path, text) in kinds::files(root, &Value::Null)? {
        std::fs::write(root.join(path), text)?;
    }
    Ok(())
}
