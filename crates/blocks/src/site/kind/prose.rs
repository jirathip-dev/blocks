use serde_json::Value;

use crate::site::write::{get, link, list, on, shown, W};

fn spans(w: &mut W<'_>, all: &[Value]) {
    for s in all.iter().filter(|s| s.is_object()) {
        let link = link(s, "link");
        let marks: Vec<&str> = [("b", "bold"), ("i", "italic"), ("code", "code")]
            .into_iter()
            .filter(|(_, k)| on(s, k))
            .map(|(t, _)| t)
            .collect();
        if let Some(href) = link {
            w.open("a", "", &[("href", href)]);
        }
        for t in &marks {
            w.open(t, "", &[]);
        }
        w.text(&shown(s.get("text")));
        for t in marks.iter().rev() {
            w.close(t);
        }
        if link.is_some() {
            w.close("a");
        }
    }
}

fn wrap(w: &mut W<'_>, tag: &str, all: &[Value]) {
    w.open(tag, "", &[]);
    spans(w, all);
    w.close(tag);
}

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    let busy: &[(&str, &str)] = if on(b, "streaming") { &[("aria-busy", "true")] } else { &[] };
    w.open_block("div", "prose", b, busy);
    for p in list(b, "parts") {
        match get(p, "part").unwrap_or_default() {
            "heading" => {
                let level = p.get("level").and_then(Value::as_u64).unwrap_or(2).clamp(1, 6);
                wrap(w, &format!("h{level}"), list(p, "spans"));
            }
            "para" => wrap(w, "p", list(p, "spans")),
            "quote" => wrap(w, "blockquote", list(p, "spans")),
            "list" => {
                let tag = if on(p, "ordered") { "ol" } else { "ul" };
                w.open(tag, "", &[]);
                for item in list(p, "items") {
                    wrap(w, "li", item.as_array().map_or(&[], Vec::as_slice));
                }
                w.close(tag);
            }
            "code" => {
                w.open("pre", "", &[]);
                let lang = get(p, "lang").map(|l| format!("lang-{l}")).unwrap_or_default();
                w.el("code", &lang, &shown(p.get("text")));
                w.close("pre");
            }
            "rule" => w.raw("<hr>"),
            _ => {}
        }
    }
    w.close("div");
}
