use serde_json::Value;

mod rounds;

use crate::site::write::{badge, get, list, on, sends, shown, ticked, toned, Go, W};

fn figure(w: &mut W<'_>, f: &Value) {
    let s = get(f, "state").unwrap_or("undefined");
    let (glyph, word, tone) = match s {
        "working" => ("●", "working", "g"),
        "needs" => ("!", "needs you", "r"),
        "fail" => ("✗", "failed", "r"),
        "done" => ("✓", "done", "mute"),
        "merged" => ("✓", "merged", "g"),
        "idle" => ("○", "idle", "mute"),
        other => ("·", other, "mute"),
    };
    w.open(
        "span",
        &format!("rsg {s} b-row__figure"),
        &[("role", "img"), ("aria-label", word), ("title", word)],
    );
    w.el("i", &format!("gl {tone}"), glyph);
    w.close("span");
}

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    if list(b, "rounds").is_empty() {
        row_of(w, b, true);
    } else {
        rounds::row(w, b);
    }
}

pub(super) fn face(w: &mut W<'_>, b: &Value, sub: bool) {
    if let Some(f) = b.get("figure").filter(|f| f.is_object()) {
        figure(w, f);
    }
    w.open("span", "rm", &[]);
    w.el("span", "rt b-row__title", &shown(b.get("title")));
    badge(w, "b-row__badge", b.get("badge"));
    if let Some(sub) = b.get("subtitle").filter(|v| sub && !v.is_null()) {
        let cls = format!("rs b-row__subtitle {}", toned(Some(sub)).1);
        ticked(
            w,
            "span",
            &cls,
            if sub.is_object() { sub.get("text") } else { Some(sub) },
        );
    }
    w.close("span");
    if let Some(v) = b.get("value").filter(|v| !v.is_null()) {
        ticked(w, "span", "rv b-row__value", Some(v));
    }
}

pub(super) fn classes(b: &Value) -> String {
    let indent = b.get("indent").and_then(Value::as_u64).filter(|i| *i > 0);
    format!(
        "row{}{}{}",
        if get(b, "style") == Some("link") { " link" } else { "" },
        if on(b, "sticky") { " sticky" } else { "" },
        indent.map_or(String::new(), |i| format!(" in{}", i.min(3)))
    )
}

pub(super) fn row_of(w: &mut W<'_>, b: &Value, hooked: bool) {
    let mut cls = classes(b);
    let swipe = list(b, "swipe");
    let go = match b.get("tap") {
        Some(t) if get(t, "url").is_none() && get(t, "open").is_none() => Go::Stay,
        t => w.tap(t, b.get("id")),
    };
    let id = shown(b.get("id"));
    let own = swipe.is_empty() && hooked;
    let mut attrs: Vec<(&str, &str)> = if own { vec![] } else { vec![("data-id", &id)] };
    let tag = match &go {
        Go::Url(u) => {
            attrs.extend([("href", u.as_str()), ("target", "_blank"), ("rel", "noopener")]);
            "a"
        }
        Go::Open(u) => {
            attrs.push(("href", u.as_str()));
            "a"
        }
        Go::Post(..) | Go::Sheet(_) | Go::Copy(_) | Go::Stay => "div",
    };
    if tag == "a" || b.get("tap").is_some() || !swipe.is_empty() {
        cls.push_str(" tap");
    }
    if tag == "div" && (b.get("tap").is_some() || !swipe.is_empty()) {
        attrs.extend([("tabindex", "0"), ("role", "button")]);
        attrs.extend(sends(b.get("tap")).map(|a| ("data-action", a)));
    }
    if !swipe.is_empty() && hooked {
        w.open_block("div", "rw", b, &[]);
    }
    if own {
        w.open_block(tag, &cls, b, &attrs);
    } else {
        w.open(tag, &cls, &attrs);
    }
    face(w, b, true);
    w.close(tag);
    if swipe.is_empty() {
        return;
    }
    w.open("div", "ra b-row__actions", &[("hidden", "")]);
    for s in swipe {
        let cls = if get(s, "tone") == Some("bad") { "bad" } else { "" };
        w.act(s, cls, b.get("id"));
    }
    w.close("div");
    if hooked {
        w.close("div");
    }
}
