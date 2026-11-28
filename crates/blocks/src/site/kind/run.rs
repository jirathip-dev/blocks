use serde_json::Value;

use crate::site::write::{fields, get, one, shown, W};

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    w.open_block("div", "run as-surface", b, &[]);
    w.el("pre", "cmd", &shown(b.get("command")));
    let sha = get(b, "sha").filter(|s| !s.is_empty()).map(|s| format!("sha {s}"));
    let meta: Vec<String> = [
        get(b, "dir").map(String::from),
        get(b, "touches").map(String::from),
        sha,
    ]
    .into_iter()
    .flatten()
    .filter(|s| !s.is_empty())
    .collect();
    w.el("p", "m", &meta.join(" · "));
    w.open("div", "bar", &[]);
    for (choice, cls) in [("approve", "primary"), ("deny", "bad")] {
        let v = fields(&[
            Some(&one("choice", Some(&Value::from(choice)))),
            Some(&one("sha", b.get("sha"))),
        ]);
        w.submit(choice, cls, b.get("id"), &shown(b.get("action")), &v, &[]);
    }
    w.close("div");
    w.close("div");
}
