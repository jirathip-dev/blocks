use serde_json::Value;

use super::{fallback, get, list, W};

pub(super) fn diff(w: &mut W<'_>, b: &Value) {
    let (Some(file), Some(hunks)) = (get(b, "file"), b.get("hunks").and_then(Value::as_array)) else {
        return fallback(w, b);
    };
    w.open_block("div", "df", b, &[("role", "group"), ("aria-label", file)]);
    w.open("div", "dfh", &[]);
    w.el("span", "dff", file);
    if let Some(s) = get(b, "summary") {
        w.el("span", "dfs", s);
    }
    w.close("div");
    if !hunks.is_empty() {
        w.open("div", "dfb", &[]);
        for k in hunks {
            w.el("div", "dfk", get(k, "at").unwrap_or_default());
            for l in list(k, "lines").iter().filter_map(Value::as_str) {
                let mut rest = l.chars();
                let sign = rest.next();
                let mark = match sign {
                    Some('+') => "add",
                    Some('-') => "del",
                    _ => "ctx",
                };
                w.open("div", &format!("dfl {mark}"), &[]);
                w.el("i", "dfm", &sign.unwrap_or(' ').to_string());
                w.text(rest.as_str());
                w.close("div");
            }
        }
        w.close("div");
    }
    w.close("div");
}
