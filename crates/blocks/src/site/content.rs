use serde_json::Value;

use super::{get, link, list, on, shown, W};

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

pub(super) fn prose(w: &mut W<'_>, b: &Value) {
    w.open_block("div", "prose", b, &[]);
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

fn figure(w: &mut W<'_>, m: &Value, hook: Option<&Value>) {
    match hook {
        Some(b) => w.open_block("figure", "media", b, &[]),
        None => w.open("figure", "media", &[]),
    }
    let [src, alt, width, height, poster] = ["src", "alt", "width", "height", "poster"].map(|k| shown(m.get(k)));
    let size = [("width", width.as_str()), ("height", height.as_str())];
    if on(m, "video") {
        let mut at = vec![
            ("src", src.as_str()),
            ("aria-label", alt.as_str()),
            ("controls", ""),
            ("preload", "metadata"),
        ];
        at.extend(size);
        at.extend(m.get("poster").map(|_| ("poster", poster.as_str())));
        w.open("video", "", &at);
        w.close("video");
    } else {
        w.open(
            "img",
            "",
            &[
                &[("src", src.as_str()), ("alt", alt.as_str()), ("loading", "lazy")],
                &size[..],
            ]
            .concat(),
        );
    }
    if let Some(c) = get(m, "caption").filter(|c| !c.is_empty()) {
        w.el("figcaption", "", c);
    }
    w.close("figure");
}

pub(super) fn media(w: &mut W<'_>, b: &Value) {
    figure(w, b, Some(b));
}

pub(super) fn hero(w: &mut W<'_>, b: &Value) {
    w.open_block("header", "hero", b, &[]);
    w.el("h1", "b-hero__title", &shown(b.get("title")));
    if let Some(s) = get(b, "subtitle").filter(|s| !s.is_empty()) {
        w.el("p", "b-hero__subtitle", s);
    }
    if let Some(m) = b.get("media").filter(|m| m.is_object()) {
        figure(w, m, None);
    }
    let acts = list(b, "actions");
    if !acts.is_empty() {
        w.open("div", "bar b-hero__actions", &[]);
        for a in acts.iter().filter(|a| a.is_object()) {
            w.act(a, "primary", b.get("id"));
        }
        w.close("div");
    }
    w.close("header");
}

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

pub(super) fn nav(w: &mut W<'_>, b: &Value) {
    w.open_block("nav", "nav", b, &[]);
    if let Some(brand) = b.get("brand").filter(|l| l.is_object()) {
        nav_link(w, brand, "brand");
    }
    for l in list(b, "links").iter().filter(|l| l.is_object()) {
        nav_link(w, l, "");
    }
    w.close("nav");
}
