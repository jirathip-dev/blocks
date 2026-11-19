use std::collections::BTreeMap;

use serde_json::Value;

use super::{get, list, shown, W};

pub(super) fn editor(w: &mut W<'_>, b: &Value) {
    let first = b.get("first").and_then(Value::as_i64).unwrap_or(1);
    let mut errs = BTreeMap::new();
    for e in list(b, "errors") {
        if let Some(n) = e.get("line").and_then(Value::as_i64) {
            errs.entry(n).or_insert_with(|| shown(e.get("message")));
        }
    }
    w.open_block("div", "ed", b, &[("tabindex", "0")]);
    for (n, line) in (first..).zip(get(b, "text").unwrap_or_default().split('\n')) {
        let m = errs.remove(&n);
        w.open("div", if m.is_some() { "edl err" } else { "edl" }, &[]);
        w.el("i", "", &n.to_string());
        w.el("span", "", if line.is_empty() { " " } else { line });
        w.close("div");
        if let Some(m) = m {
            w.el("p", "ede", &m);
        }
    }
    for (n, m) in errs {
        w.el("p", "ede far", &format!("line {n} · {m}"));
    }
    w.close("div");
}
