use serde_json::Value;

use crate::site::write::{fields, get, list, on, shown, Go, W};

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    let cls = if b.get("submit").is_some_and(Value::is_object) {
        "form say"
    } else {
        "form as-surface"
    };
    form_of(w, b, cls, false);
}

pub(super) fn form_of(w: &mut W<'_>, b: &Value, cls: &str, bar: bool) {
    let submit = b.get("submit").filter(|s| s.is_object());
    w.open_block("div", cls, b, &[]);
    let action = submit.and_then(|s| get(s, "action")).or_else(|| get(b, "action"));
    w.multipart = list(b, "fields").iter().any(|x| matches!(get(x, "type"), Some("upload" | "scan")));
    let f = action.map(|a| w.post(b.get("id"), a, &fields(&[submit.and_then(|s| s.get("values"))])));
    w.multipart = false;
    let owner = f.clone().unwrap_or_default();
    let tie: &[(&str, &str)] = if f.is_some() { &[("form", &owner)] } else { &[] };
    for x in list(b, "fields").iter().filter(|x| x.is_object()) {
        crate::site::field::field(w, x, tie);
    }
    if let (Some(s), Some(f)) = (submit, f) {
        if bar {
            w.open("div", "bar", &[]);
        }
        let off: &[(&str, &str)] = if bar && on(s, "off") { &[("disabled", "")] } else { &[] };
        w.btn(
            &shown(s.get("label")),
            "",
            &Go::Post(f, action.unwrap_or_default().into()),
            off,
            None,
        );
        if bar {
            w.close("div");
        }
    }
    w.close("div");
}
