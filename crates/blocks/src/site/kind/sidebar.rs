use serde_json::Value;

use crate::site::write::{get, link, list, on, shown, W};

fn icon(w: &mut W<'_>, l: &Value) {
    let label = get(l, "label").unwrap_or_default();
    let glyph = get(l, "icon")
        .filter(|i| !i.is_empty())
        .map_or_else(|| label.chars().take(1).flat_map(char::to_uppercase).collect(), str::to_string);
    let initials = glyph.len() == 2 && glyph.chars().all(|c| c.is_ascii_uppercase());
    w.open("i", if initials { "sdi av" } else { "sdi" }, &[("aria-hidden", "true")]);
    w.text(&glyph);
    w.close("i");
}

fn inner(w: &mut W<'_>, l: &Value, child: bool) {
    if !child {
        icon(w, l);
    }
    let label = get(l, "label").unwrap_or_default();
    w.open("span", "sdl", &[("title", label)]);
    w.text(label);
    w.close("span");
    let Some(b) = l.get("badge").filter(|b| b.is_object()) else {
        return;
    };
    let count = b.get("count").and_then(Value::as_u64).unwrap_or_default();
    let bad = get(b, "tone") == Some("bad");
    w.open("span", if bad { "tag bad" } else { "tag" }, &[]);
    w.open("span", "", &[("aria-hidden", "true")]);
    w.text(&if count > 99 { "99+".into() } else { count.to_string() });
    w.close("span");
    let said = if bad { "need attention" } else { "new" };
    w.el("span", "b-sr", &format!("{count} {said}"));
    w.close("span");
}

fn side_link(w: &mut W<'_>, l: &Value, cls: &str, child: bool) {
    let href = link(l, "href");
    let tag = if href.is_some() { "a" } else { "span" };
    let mut at: Vec<(&str, &str)> = href.map(|h| ("href", h)).into_iter().collect();
    if on(l, "current") {
        at.push(("aria-current", "page"));
    }
    w.open(tag, cls, &at);
    inner(w, l, child);
    w.close(tag);
}

fn item(w: &mut W<'_>, l: &Value) {
    w.open("li", "", &[]);
    let kids = list(l, "children");
    if l.get("children").is_some_and(Value::is_array) {
        let current = kids.iter().any(|k| on(k, "current"));
        let open: &[(&str, &str)] = if on(l, "open") || current { &[("open", "")] } else { &[] };
        w.open("details", "", open);
        w.open("summary", if current { "sdk in" } else { "sdk" }, &[]);
        inner(w, l, false);
        w.open("i", "sdc", &[("aria-hidden", "true")]);
        w.text("▸");
        w.close("i");
        w.close("summary");
        w.open("ul", "sdsub", &[]);
        for k in kids {
            w.open("li", "", &[]);
            side_link(w, k, "sdk", true);
            w.close("li");
        }
        w.close("ul");
        w.close("details");
    } else {
        side_link(w, l, "sdk", false);
    }
    w.close("li");
}

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    let id = format!("sd-{}", b.get("id").filter(|v| !v.is_null()).map_or_else(|| "side".into(), |v| shown(Some(v))));
    let groups = list(b, "groups");
    let pages = groups.iter().flat_map(|g| list(g, "links")).flat_map(|l| std::iter::once(l).chain(list(l, "children")));
    let here = pages.chain(list(b, "footer")).find(|l| on(l, "current"));
    let title = here.or_else(|| b.get("brand")).and_then(|l| get(l, "label")).or_else(|| get(b, "label"));
    w.open_block("div", "sd", b, &[("data-side", "rail")]);
    let to = format!("#{id}");
    w.open("a", "sdm", &[("href", &to), ("aria-label", "menu"), ("aria-controls", &id)]);
    w.el("span", "", "≡");
    w.close("a");
    w.el("span", "sdn", title.unwrap_or_default());
    w.open("a", "sdscrim", &[("href", "#"), ("aria-hidden", "true"), ("tabindex", "-1")]);
    w.close("a");
    w.open("div", "sdp", &[("id", &id)]);
    w.open("div", "sdh", &[]);
    if let Some(brand) = b.get("brand").filter(|l| l.is_object()) {
        side_link(w, brand, "sdk sdb", false);
    }
    w.open("button", "sdpin", &[("type", "button"), ("aria-label", "pin sidebar")]);
    w.el("span", "", "pin");
    w.el("span", "", "unpin");
    w.close("button");
    w.open("a", "sdx", &[("href", "#"), ("aria-label", "close menu")]);
    w.el("span", "", "×");
    w.close("a");
    w.close("div");
    w.open("div", "sdg", &[]);
    if groups.iter().all(|g| list(g, "links").is_empty()) {
        w.el("p", "sde", get(b, "empty").unwrap_or("No pages yet"));
    }
    for (gi, g) in groups.iter().enumerate().filter(|(_, g)| !list(g, "links").is_empty()) {
        let t = format!("{id}-t{gi}");
        let title = get(g, "title").filter(|t| !t.is_empty());
        w.open("section", "sdgr", &title.map(|_| ("aria-labelledby", t.as_str())).into_iter().collect::<Vec<_>>());
        if let Some(title) = title {
            w.open("h3", "sdgt", &[("id", &t)]);
            w.text(title);
            w.close("h3");
        }
        w.open("ul", "", &[]);
        for l in list(g, "links") {
            item(w, l);
        }
        w.close("ul");
        w.close("section");
    }
    w.close("div");
    let footer = list(b, "footer");
    if !footer.is_empty() {
        w.open("div", "sdf", &[]);
        w.open("ul", "", &[]);
        for l in footer {
            w.open("li", "", &[]);
            side_link(w, l, "sdk", false);
            w.close("li");
        }
        w.close("ul");
        w.close("div");
    }
    w.close("div");
    w.close("div");
}
