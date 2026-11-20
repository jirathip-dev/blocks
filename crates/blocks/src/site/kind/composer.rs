use serde_json::Value;

use crate::site::write::{fields, get, list, one, shown, Go, W};

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    let acts = b.get("acts");
    let act = |k: &str| acts.and_then(|a| get(a, k)).unwrap_or_default().to_string();
    w.open_block("div", "cmp", b, &[]);
    for m in list(b, "queued").iter().filter(|m| m.is_object()) {
        let q = shown(m.get("q"));
        w.open("div", "qd", &[("data-q", &q)]);
        w.el("span", "qt", &shown(m.get("text")));
        let qv = fields(&[Some(&one("q", m.get("q")))]);
        w.submit("send now", "primary", b.get("id"), &act("steer"), &qv, &[]);
        w.btn("edit", "", &Go::Stay, &[], None);
        w.submit("remove", "bad", b.get("id"), &act("unqueue"), &qv, &[]);
        w.close("div");
    }
    let f = w.post(b.get("id"), &shown(b.get("action")), &fields(&[b.get("values")]));
    w.open("div", "cr", &[]);
    w.btn("+", "", &Go::Stay, &[("aria-label", "attach")], None);
    w.open("input", "", &[("type", "file"), ("multiple", ""), ("hidden", "")]);
    let hint = shown(b.get("placeholder"));
    w.open(
        "textarea",
        "",
        &[("name", "text"), ("rows", "1"), ("placeholder", &hint), ("form", &f)],
    );
    w.close("textarea");
    let label = if b.get("working").is_some_and(|x| !x.is_null()) {
        "queue".into()
    } else {
        shown(b.get("label"))
    };
    let said = if label.is_empty() { "send" } else { &label };
    w.btn(
        &label,
        "primary",
        &Go::Post(f.clone(), shown(b.get("action"))),
        &[("aria-label", said)],
        None,
    );
    w.close("div");
    let chips: Vec<&Value> = list(b, "chips").iter().filter(|c| c.is_object()).collect();
    if !chips.is_empty() {
        w.open("div", "pk", &[]);
        for ch in chips {
            let n = shown(ch.get("name"));
            let cur = shown(ch.get("cur"));
            w.open("select", "", &[("aria-label", &n), ("name", &n), ("form", &f)]);
            if cur.is_empty() {
                w.option("", &n, true);
            }
            for o in list(ch, "all").iter().map(|o| shown(Some(o))) {
                w.option(&o, &o, o == cur);
            }
            w.close("select");
        }
        w.close("div");
    }
    w.close("div");
}
