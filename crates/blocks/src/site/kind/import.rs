use serde_json::Value;

use crate::site::write::{get, list, on, W};
use crate::kind::{Import, Locale};

fn word(key: &str) -> &'static str {
    Import::WORDS.iter().find(|w| w.0 == key).map_or("", |w| w.1)
}

fn off(w: &mut W<'_>, label: &str) {
    w.open("button", "", &[("type", "button"), ("disabled", "")]);
    w.el("span", "", label);
    w.close("button");
}

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    let action = get(b, "action").is_some();
    w.open_block("section", "im", b, &[]);
    w.open("div", "imh", &[]);
    w.el("h3", "sh", get(b, "title").unwrap_or_default());
    if b.get("template").and_then(Value::as_bool) != Some(false) {
        off(w, word("imTemplate"));
    }
    w.close("div");
    if let Some(e) = get(b, "error") {
        w.el("p", "fe", e);
    }
    w.open("div", "imd", &[]);
    w.el("span", "", word("imDrop"));
    w.el("span", "m", word("imOr"));
    off(w, Locale::default().word("file1"));
    let max = b.get("max").and_then(Value::as_u64).unwrap_or(5000);
    let hint = if action {
        word("imHint").replace("{max}", &grouped(max))
    } else {
        word("imOff").into()
    };
    w.el("span", "m", &hint);
    w.close("div");
    let cols = list(b, "columns");
    w.open("p", "imn", &[]);
    w.text(&format!("{} ", word("imNeeds")));
    for (i, c) in cols.iter().filter(|c| on(c, "required")).enumerate() {
        if i > 0 {
            w.text(", ");
        }
        w.el("b", "", get(c, "label").unwrap_or_default());
    }
    let may: Vec<String> = cols
        .iter()
        .filter(|c| !on(c, "required"))
        .map(|c| {
            let label = get(c, "label").unwrap_or_default();
            let vs: Vec<&str> = list(c, "values").iter().filter_map(Value::as_str).collect();
            if vs.is_empty() {
                label.to_string()
            } else {
                format!("{label} ({})", vs.join(", "))
            }
        })
        .collect();
    if !may.is_empty() {
        w.text(&format!(" {} {}", word("imMay"), may.join(", ")));
    }
    w.close("p");
    w.close("section");
}

fn grouped(n: u64) -> String {
    let s = n.to_string();
    let mut out = String::new();
    for (i, c) in s.chars().enumerate() {
        if i > 0 && (s.len() - i).is_multiple_of(3) {
            out.push(',');
        }
        out.push(c);
    }
    out
}
