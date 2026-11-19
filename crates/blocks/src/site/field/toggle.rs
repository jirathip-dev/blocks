use serde_json::Value;

use super::super::{on, W};

pub(super) fn view(w: &mut W<'_>, x: &Value, attrs: &[(&str, &str)]) {
    let mut attrs = attrs.to_vec();
    attrs.extend([("type", "checkbox"), ("role", "switch")]);
    if on(x, "value") {
        attrs.push(("checked", ""));
    }
    w.open("input", "", &attrs);
}
