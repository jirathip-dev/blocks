use std::path::Path;

use serde_json::Value;

use super::Files;

mod kinds;
mod rules;
mod site;

pub(super) fn files(root: &Path, s: &Value) -> std::io::Result<Files> {
    let mut out = rules::files(root, s)?;
    out.extend(kinds::files(root, s)?);
    out.extend(site::files(root)?);
    Ok(out)
}

pub(super) fn kinds(root: &Path) -> std::io::Result<Files> {
    kinds::files(root, &Value::Null)
}
