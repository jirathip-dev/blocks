use serde_json::Value;

use crate::site::write::{list, on, W};

const MIMES: &[(&str, &str)] = &[
    ("image", "image/*"),
    ("pdf", ".pdf,application/pdf"),
    ("sheet", ".csv,.xlsx,text/csv"),
];

pub(super) fn view(w: &mut W<'_>, x: &Value, attrs: &[(&str, &str)]) {
    let kinds: Vec<&str> = list(x, "accept").iter().filter_map(Value::as_str).collect();
    let accept: Vec<&str> = kinds
        .iter()
        .map(|k| MIMES.iter().find(|m| m.0 == *k).map_or(*k, |m| m.1))
        .collect();
    let accept = accept.join(",");
    let mut attrs = attrs.to_vec();
    attrs.push(("type", "file"));
    if !accept.is_empty() {
        attrs.push(("accept", &accept));
    }
    if on(x, "capture") {
        attrs.push(("capture", "environment"));
    }
    if on(x, "many") {
        attrs.push(("multiple", ""));
    }
    let names: Vec<&str> = kinds
        .iter()
        .map(|k| Some(w.locale.word(k)).filter(|t| !t.is_empty()).unwrap_or(k))
        .collect();
    let mb = x.get("mb").and_then(Value::as_u64).map(|mb| {
        let key = if on(x, "many") { "each" } else { "upTo" };
        w.locale.word(key).replace("{mb}", &mb.to_string())
    });
    let types = Some(names.join(w.locale.word("or"))).filter(|t| !t.is_empty());
    let hint: Vec<String> = types.into_iter().chain(mb).collect();
    w.open("span", "fu", &[]);
    w.open("span", "fub", &[]);
    w.open("input", "sf", &attrs);
    w.el("span", "fuh", &hint.join(" · "));
    w.close("span");
    w.close("span");
}
