use serde_json::Value;

use crate::site::write::W;

pub(super) fn view(w: &mut W<'_>, _x: &Value, attrs: &[(&str, &str)]) {
    let mut attrs = attrs.to_vec();
    attrs.extend([
        ("type", "file"),
        ("accept", "image/*"),
        ("capture", "environment"),
        ("multiple", ""),
    ]);
    let hint = w.locale.word("image").to_owned();
    w.open("span", "fu", &[]);
    w.open("span", "fub", &[]);
    w.open("input", "sf", &attrs);
    w.el("span", "fuh", &hint);
    w.close("span");
    w.close("span");
}
