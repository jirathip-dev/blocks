use serde_json::Value;

use super::kids_of;
use crate::site::write::{get, list, W};

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    w.open_block("div", "list", b, &[]);
    let rows = list(b, "rows");
    if let Some(e) = get(b, "empty").filter(|_| rows.is_empty()) {
        w.el("p", "empty", e);
    }
    kids_of(w, rows, true);
    w.close("div");
}
