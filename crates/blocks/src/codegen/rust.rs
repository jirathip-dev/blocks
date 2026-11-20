use std::path::Path;

use serde_json::Value;

use super::Files;

mod kinds;
mod rules;

pub(super) fn files(root: &Path, s: &Value) -> std::io::Result<Files> {
    let mut out = rules::files(root, s)?;
    out.extend(kinds::files(root, s)?);
    Ok(out)
}
