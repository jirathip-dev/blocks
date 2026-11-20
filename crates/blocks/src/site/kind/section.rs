use serde_json::Value;

use super::kids;
use crate::site::write::{get, list, W};

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    w.open_block("section", "sec", b, &[]);
    if let Some(head) = get(b, "header").filter(|h| !h.is_empty()) {
        let k = match head.split(' ').next().unwrap_or_default() {
            "waiting" | "blocked" => "needs",
            "in" => "working",
            other => other,
        };
        let sh = match k {
            "needs" => "r",
            "working" => "g",
            _ => "",
        };
        w.el("h3", &format!("sh {sh}"), head);
    }
    kids(w, list(b, "blocks"));
    if let Some(f) = get(b, "footer").filter(|f| !f.is_empty()) {
        w.el("p", "m foot", f);
    }
    w.close("section");
}
