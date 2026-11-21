use serde_json::Value;

use super::kids;
use crate::site::write::{get, link, list, Go, W};

fn word(role: &str) -> &str {
    if ["owner", "system"].contains(&role) {
        role
    } else {
        "agent"
    }
}

fn file(w: &mut W<'_>, b: &Value, f: &Value) {
    let name = get(f, "name").unwrap_or_default();
    let src = link(f, "src");
    let go = w.tap(f.get("tap"), Some(b));
    let mut at = vec![("title", name), ("aria-label", name)];
    let tag = match &go {
        Go::Url(u) => {
            at.extend([("href", u.as_str()), ("target", "_blank"), ("rel", "noopener")]);
            "a"
        }
        Go::Open(u) => {
            at.push(("href", u.as_str()));
            "a"
        }
        Go::Post(form, x) => {
            at.extend([("type", "submit"), ("form", form.as_str()), ("data-action", x.as_str())]);
            "button"
        }
        Go::Sheet(s) => {
            at.extend([("type", "button"), ("data-sheet", s.as_str())]);
            "button"
        }
        Go::Stay => {
            at.push(("type", "button"));
            "button"
        }
    };
    w.open(tag, if src.is_some() { "" } else { "mff" }, &at);
    if let Some(src) = src {
        w.open("img", "", &[("src", src), ("alt", name), ("loading", "lazy")]);
    } else {
        let (x, rest) = name.rsplit_once('.').filter(|(r, _)| !r.is_empty()).map_or(("", name), |(r, x)| (x, r));
        w.el("span", "mfx", x);
        w.el("span", "mfn", rest);
    }
    w.close(tag);
}

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    said(w, b, false);
}

pub(super) fn said(w: &mut W<'_>, b: &Value, cont: bool) {
    let role = word(get(b, "role").unwrap_or_default());
    let name = get(b, "name").unwrap_or_default();
    w.open_block("article", if cont { "msg cont" } else { "msg" }, b, &[]);
    if role != "system" {
        if let Some(src) = link(b, "avatar") {
            w.open("img", "mav b-message__avatar", &[("src", src), ("alt", ""), ("aria-hidden", "true")]);
        } else {
            w.open("span", "mav ini", &[("aria-hidden", "true")]);
            w.text(&name.trim().chars().next().map(String::from).unwrap_or_default());
            w.close("span");
        }
    }
    w.open("div", "mh", &[]);
    w.el("span", "mn b-message__name", name);
    w.el("span", "mr", role);
    w.close("div");
    w.open("div", "mb", &[]);
    kids(w, list(b, "blocks"));
    let files = list(b, "files");
    if !files.is_empty() {
        let image = |f: &&Value| link(f, "src").is_some();
        w.open("div", "mf b-message__files", &[]);
        if files.iter().any(|f| image(&f)) {
            w.open("div", "mfi", &[]);
            files.iter().filter(image).for_each(|f| file(w, b, f));
            w.close("div");
        }
        files.iter().filter(|f| !image(f)).for_each(|f| file(w, b, f));
        w.close("div");
    }
    w.close("div");
    w.close("article");
}
