use serde_json::Value;

use crate::site::write::{get, W};

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    w.open_block("div", "{{name}}", b, &[]);
    w.text(get(b, "label").unwrap_or_default());
    w.close("div");
}
