use serde_json::Value;

use crate::site::write::{link, list, shown, W};

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    w.open_block("div", "imgs", b, &[]);
    for i in list(b, "items").iter().filter(|i| i.is_object()) {
        let alt = shown(i.get("alt"));
        let Some(src) = link(i, "src") else {
            w.open("span", "", &[]);
            w.text(&alt);
            w.close("span");
            continue;
        };
        w.open("a", "", &[("href", src), ("target", "_blank"), ("rel", "noopener")]);
        w.open("img", "", &[("src", src), ("alt", &alt), ("loading", "lazy")]);
        w.close("a");
    }
    w.close("div");
}
