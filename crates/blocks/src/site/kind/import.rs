use serde_json::Value;

use crate::site::write::{get, list, on, W};

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    w.open_block("section", "im", b, &[]);
    w.open("div", "imh", &[]);
    w.el("h3", "sh", get(b, "title").unwrap_or_default());
    w.close("div");
    if let Some(e) = get(b, "error") {
        w.el("p", "fe", e);
    }
    w.el(
        "p",
        "imn imj",
        "Importing a file needs JavaScript. The file needs these columns:",
    );
    w.open("p", "imn", &[]);
    for (i, c) in list(b, "columns").iter().enumerate() {
        if i > 0 {
            w.text(", ");
        }
        w.el(if on(c, "required") { "b" } else { "span" }, "", get(c, "label").unwrap_or_default());
    }
    w.close("p");
    w.close("section");
}
