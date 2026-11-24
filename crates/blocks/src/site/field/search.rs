use serde_json::Value;

use crate::site::write::{get, shown, W};

pub(super) fn view(w: &mut W<'_>, x: &Value, attrs: &[(&str, &str)]) {
    let value = shown(x.get("value"));
    let mut attrs = attrs.to_vec();
    attrs.extend([
        ("type", "search"),
        ("autocomplete", "off"),
        ("placeholder", get(x, "placeholder").unwrap_or_default()),
    ]);
    if !value.is_empty() {
        attrs.push(("value", &value));
    }
    w.open("span", "sb", &[]);
    w.open("input", "", &attrs);
    w.open("span", "sbn", &[("aria-live", "polite")]);
    w.close("span");
    let hide: &[(&str, &str)] = if value.is_empty() {
        &[("type", "button"), ("hidden", "")]
    } else {
        &[("type", "button")]
    };
    w.open("button", "sbx", hide);
    w.el("span", "", w.locale.word("clear"));
    w.close("button");
    w.close("span");
}
