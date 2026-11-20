use serde_json::Value;

use crate::site::write::{fields, get, on, shown, Go, W};

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    w.open_block("div", "secret", b, &[]);
    let name = shown(b.get("name"));
    let f = w.post(b.get("id"), &shown(b.get("action")), &fields(&[b.get("values")]));
    let set = on(b, "set");
    w.open("label", "fd", &[]);
    w.open("span", "fk", &[]);
    w.text(get(b, "label").unwrap_or(&name));
    if set {
        w.el("span", "set", "set \u{2713}");
    }
    w.close("span");
    let hint = if set {
        "paste to replace"
    } else {
        get(b, "placeholder").unwrap_or_default()
    };
    w.open(
        "input",
        "",
        &[
            ("type", "password"),
            ("name", &name),
            ("placeholder", hint),
            ("autocomplete", "new-password"),
            ("spellcheck", "false"),
            ("form", &f),
        ],
    );
    w.close("label");
    w.open("div", "ra", &[]);
    w.el("p", "m sn", "sent to the app only, never to the agent");
    w.btn("send", "", &Go::Post(f, shown(b.get("action"))), &[], None);
    w.close("div");
    w.close("div");
}
