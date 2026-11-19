use serde_json::Value;

use super::kids;
use crate::site::write::{badge, fields, get, list, one, shown, ticked, toned, W};

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    let cls = format!("card {} k-{}", shown(b.get("tone")), shown(b.get("kind")));
    w.open_block("div", &cls, b, &[]);
    if let Some(fold) = b.get("fold").filter(|f| f.is_object()) {
        w.open(
            "div",
            "fold",
            &[("tabindex", "0"), ("role", "button"), ("aria-expanded", "false")],
        );
        w.el("span", "fl", &shown(fold.get("line")));
        if let Some(m) = fold.get("main").filter(|m| m.is_object()) {
            let v = fields(&[m.get("values"), Some(&one("choice", m.get("value")))]);
            w.submit(
                &shown(m.get("label")),
                "main",
                m.get("block"),
                &shown(m.get("action")),
                &v,
                &[],
            );
        }
        w.close("div");
        w.close("div");
        return;
    }
    let mark = b.get("badge").filter(|v| !v.is_null());
    if get(b, "title").is_some_and(|t| !t.is_empty()) || mark.is_some() {
        w.open("div", "ch", &[]);
        w.el("b", "b-card__title", &shown(b.get("title")));
        badge(w, "b-card__badge", mark);
        if let Some(m) = b.get("meta").filter(|v| !v.is_null()) {
            w.raw(" ");
            ticked(w, "span", "m", Some(m));
        }
        w.close("div");
    }
    if let Some(s) = b.get("subtitle").filter(|v| !v.is_null()) {
        w.el("p", "m b-card__subtitle", &toned(Some(s)).0);
    }
    kids(w, list(b, "blocks"));
    let buttons = list(b, "buttons");
    if buttons.iter().any(Value::is_object) {
        w.open("div", "bar b-card__actions", &[]);
        kids(w, buttons);
        w.close("div");
    }
    w.close("div");
}
