use serde_json::Value;

use crate::site::md::md;
use crate::site::write::{shown, W};

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    let source = shown(b.get("markdown"));
    w.open_block("div", "txt", b, &[("data-md", &source)]);
    w.raw(&md(&source));
    w.close("div");
}
