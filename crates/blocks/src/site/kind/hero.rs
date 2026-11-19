use serde_json::Value;

use super::media::figure;
use crate::site::write::{get, list, shown, W};

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
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
