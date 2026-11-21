use serde_json::Value;

use crate::site::write::{get, W};

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    w.open_block("div", "message", b, &[]);
    w.text(get(b, "name").unwrap_or_default());
    w.close("div");
}
