use serde_json::Value;

use crate::site::write::{fields, get, list, one, shown, ticked, Go, W};

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    w.open_block("div", "choice as-surface", b, &[]);
    let rec = b.get("recommended");
    let mut opts: Vec<&Value> = list(b, "options").iter().filter(|o| o.is_object()).collect();
    opts.sort_by_key(|o| o.get("value") != rec || rec.is_none());
    let action = shown(b.get("action"));
    for o in opts {
        let v = fields(&[b.get("values"), o.get("values"), Some(&one("choice", o.get("value")))]);
        let mine = rec.is_some() && o.get("value") == rec;
        let label = format!("{}{}", shown(o.get("label")), if mine { " · recommended" } else { "" });
        w.submit(&label, "pick", b.get("id"), &action, &v, &[]);
    }
    if let Some(d) = b.get("default").filter(|d| d.is_object()) {
        let t = fields(&[Some(&one("until", d.get("until"))), Some(&one("label", d.get("label")))]);
        ticked(w, "p", "m", Some(&Value::Object(t)));
    }
    if let Some(other) = b.get("other").filter(|o| o.is_object()) {
        let v = fields(&[
            b.get("values"),
            Some(&one("choice", Some(&Value::from(shown(other.get("for")))))),
        ]);
        let f = w.post(b.get("id"), &action, &v);
        let hint = get(other, "placeholder").unwrap_or("other…");
        w.open("form", "other", &[]);
        w.open(
            "input",
            "",
            &[
                ("name", "other"),
                ("placeholder", hint),
                ("autocomplete", "off"),
                ("form", &f),
            ],
        );
        w.btn("send", "", &Go::Post(f, action.clone()), &[], None);
        w.close("form");
    }
    w.close("div");
}
