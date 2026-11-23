use serde_json::Value;

use super::kids;
use crate::site::write::{list, shown, W};

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    w.open_block("div", "scr", b, &[]);
    w.open("p", "tabh", &[]);
    w.el("span", "tw b-screen__title", &shown(b.get("title")));
    for a in list(b, "actions") {
        let menu = a.get("menu").and_then(Value::as_array);
        for m in menu.map_or(std::slice::from_ref(a), Vec::as_slice) {
            w.act(m, "b-screen__actions", None);
        }
    }
    w.close("p");
    kids(w, list(b, "blocks"));
    w.close("div");
}
