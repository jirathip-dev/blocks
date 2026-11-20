use serde_json::Value;

use serde_json::Map;

use crate::site::write::{list, shown, W};

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    w.open_block("div", "chips", b, &[]);
    let sel = list(b, "selected");
    for o in list(b, "options").iter().filter(|o| o.is_object()) {
        let v = o.get("value").cloned().unwrap_or(Value::Null);
        let pressed = sel.contains(&v);
        let at = [("aria-pressed", if pressed { "true" } else { "false" })];
        let v = Map::from_iter([(shown(b.get("name")), v)]);
        let (label, cls) = (shown(o.get("label")), if pressed { "on" } else { "" });
        w.submit(&label, cls, b.get("id"), &shown(b.get("action")), &v, &at);
    }
    w.close("div");
}
