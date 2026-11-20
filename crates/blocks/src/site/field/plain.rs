use serde_json::Value;

use crate::behave;
use crate::site::write::{get, shown, W};

pub(super) fn view(w: &mut W<'_>, x: &Value, attrs: &[(&str, &str)]) {
    input(w, x, attrs, false, get(x, "placeholder").unwrap_or_default());
}

pub(super) fn input(w: &mut W<'_>, x: &Value, attrs: &[(&str, &str)], password: bool, placeholder: &str) {
    let hints = behave::hints(x);
    let kb = get(x, "keyboard").unwrap_or_default();
    let typed = hints.iter().find(|(k, _)| *k == "type").map(|(_, v)| v.as_str());
    let kind = match (password, kb, typed) {
        (true, _, _) => "password",
        (false, _, Some(t)) => t,
        (false, "url", None) => "url",
        _ => "text",
    };
    let mut attrs = attrs.to_vec();
    attrs.extend([("type", kind), ("autocomplete", "off")]);
    attrs.extend(
        hints
            .iter()
            .filter(|(k, _)| *k != "type")
            .map(|(k, v)| (*k, v.as_str())),
    );
    match kb {
        "url" => attrs.push(("inputmode", "url")),
        "number" => attrs.push(("inputmode", "decimal")),
        _ => {}
    }
    attrs.push(("placeholder", placeholder));
    let value = shown(x.get("value"));
    if !password && !value.is_empty() {
        attrs.push(("value", &value));
    }
    w.open("input", "", &attrs);
}
