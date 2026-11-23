use serde_json::Value;

use crate::site::write::{get, on, W};

pub(super) fn view(w: &mut W<'_>, x: &Value, attrs: &[(&str, &str)]) {
    let mut attrs = attrs.to_vec();
    attrs.push(("type", "checkbox"));
    if get(x, "as") != Some("check") {
        attrs.push(("role", "switch"));
    }
    if on(x, "value") {
        attrs.push(("checked", ""));
    }
    w.open("input", "", &attrs);
}
