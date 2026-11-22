use serde_json::{Map, Value};

use super::kids;
use crate::site::write::{get, list, shown, Go, W};

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    let v = get(b, "variant")
        .filter(|v| ["alert", "tool"].contains(v))
        .unwrap_or("dialog");
    let mid = format!("{}-m", get(b, "id").unwrap_or("modal"));
    let message = get(b, "message");
    let mut at = vec![("open", "")];
    if v != "tool" {
        at.push(("aria-modal", "true"));
    }
    if v == "alert" && message.is_some() {
        at.push(("aria-describedby", &mid));
    }
    w.open_block("dialog", &format!("md {}", if v == "dialog" { "dlg" } else { v }), b, &at);
    let title = shown(b.get("title"));
    if v == "alert" {
        w.open("header", "mdh", &[]);
        w.el("span", "mdt", &title);
    } else {
        w.open("div", "mdk", &[("role", "button"), ("tabindex", "0"), ("aria-label", "close")]);
        w.close("div");
        w.open("header", "mdh", &[]);
        w.open("span", "mdg", &[("aria-hidden", "true")]);
        w.text("⋮⋮");
        w.close("span");
        w.open("span", "mdt", &[("tabindex", "0"), ("aria-roledescription", "movable heading")]);
        w.text(&title);
        w.close("span");
        if v == "tool" {
            w.btn("–", "mdn", &Go::Stay, &[("aria-label", "minimise")], None);
        }
        w.btn("×", "mdx", &Go::Stay, &[("aria-label", "close")], None);
    }
    w.close("header");
    w.open("div", "mdb", &[]);
    if let Some(m) = message {
        w.open("p", "mdm", &[("id", &mid)]);
        w.text(m);
        w.close("p");
    }
    kids(w, list(b, "blocks"));
    w.close("div");
    let done = b.get("done").filter(|d| d.is_object());
    let ok = get(b, "ok")
        .or_else(|| done.and_then(|d| get(d, "label")))
        .or((v == "alert").then_some("ok"));
    let cancel = get(b, "cancel");
    if cancel.is_some() || ok.is_some() {
        w.open("footer", "mdf", &[]);
        if let Some(c) = cancel {
            w.btn(c, "mdc", &Go::Stay, &[], None);
        }
        if let Some(ok) = ok {
            let action = done.and_then(|d| get(d, "action")).unwrap_or_default();
            let bad = b.get("destructive").and_then(Value::as_bool) == Some(true);
            w.submit(ok, if bad { "mdo bad" } else { "mdo" }, b.get("id"), action, &Map::new(), &[]);
        }
        w.close("footer");
    }
    if v == "tool" {
        let slider = [
            ("role", "slider"),
            ("tabindex", "0"),
            ("aria-label", "resize"),
            ("aria-valuemin", "280"),
            ("aria-valuenow", "360"),
            ("aria-valuetext", "360 by 440"),
        ];
        w.open("span", "mdz", &slider);
        w.close("span");
        w.open("span", "mde", &[("aria-hidden", "true")]);
        w.close("span");
    }
    w.close("dialog");
}
