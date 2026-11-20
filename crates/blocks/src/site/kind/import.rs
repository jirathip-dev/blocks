use serde_json::Value;

use crate::kind::Import;
use crate::site::write::{get, link, list, on, Go, W};

fn word(key: &str) -> &'static str {
    Import::WORDS.iter().find(|w| w.0 == key).map_or("", |w| w.1)
}

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    let title = get(b, "title").unwrap_or_default();
    w.open_block("section", "im", b, &[]);
    w.open("div", "imh", &[]);
    w.el("h3", "sh", title);
    if let Some(t) = b.get("template") {
        let name = format!("{}: {title}", word("imTemplate"));
        let file = get(t, "name").unwrap_or_default();
        let go = Go::Open(link(t, "src").unwrap_or_default().into());
        w.btn(word("imTemplate"), "", &go, &[("aria-label", &name), ("download", file)], None);
    }
    w.close("div");
    if let Some(e) = get(b, "error") {
        w.el("p", "fe", e);
    }
    w.el("p", "imn", word("imNoJs"));
    w.open("p", "imn", &[]);
    for (i, c) in list(b, "columns").iter().enumerate() {
        if i > 0 {
            w.text(", ");
        }
        let tag = if on(c, "required") { "b" } else { "span" };
        w.el(tag, "", get(c, "label").unwrap_or_default());
    }
    w.close("p");
    w.close("section");
}
