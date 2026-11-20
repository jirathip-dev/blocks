use serde_json::Value;

use crate::site::write::{link, list, on, shown, W};

fn nav_link(w: &mut W<'_>, l: &Value, cls: &str) {
    let href = link(l, "href");
    let tag = if href.is_some() { "a" } else { "span" };
    let mut at: Vec<(&str, &str)> = href.map(|h| ("href", h)).into_iter().collect();
    if on(l, "current") {
        at.push(("aria-current", "page"));
    }
    w.open(tag, cls, &at);
    w.text(&shown(l.get("label")));
    w.close(tag);
}

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    w.open_block("nav", "nav", b, &[]);
    if let Some(brand) = b.get("brand").filter(|l| l.is_object()) {
        nav_link(w, brand, "brand");
    }
    for l in list(b, "links").iter().filter(|l| l.is_object()) {
        nav_link(w, l, "");
    }
    w.close("nav");
}
