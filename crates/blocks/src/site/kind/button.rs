use serde_json::Value;

use crate::site::write::{fields, get, shown, Go, W};

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    let go = match (b.get("tap"), get(b, "action")) {
        (Some(t), _) => w.tap(Some(t), b.get("id")),
        (None, Some(a)) => Go::Post(w.post(b.get("id"), a, &fields(&[b.get("values")])), a.into()),
        (None, None) => Go::Stay,
    };
    w.label = "as-button-label";
    w.btn(&shown(b.get("label")), &shown(b.get("style")), &go, &[], Some(b));
}
