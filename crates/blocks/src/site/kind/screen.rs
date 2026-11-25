use serde_json::Value;

use super::kids;
use crate::site::write::{get, list, shown, W};
use crate::tree::columns;

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    let split = columns(b);
    w.open_block("div", if split.is_some() { "scr split" } else { "scr" }, b, &[]);
    w.open("p", "tabh", &[]);
    w.el("span", "tw b-screen__title", &shown(b.get("title")));
    for a in list(b, "actions") {
        let menu = a.get("menu").and_then(Value::as_array);
        for m in menu.map_or(std::slice::from_ref(a), Vec::as_slice) {
            w.act(m, "b-screen__actions", None);
        }
    }
    w.close("p");
    if let Some((main, side)) = split {
        let main: Vec<Value> = main.into_iter().cloned().collect();
        let side: Vec<Value> = side.into_iter().cloned().collect();
        let names: Vec<&str> = side.iter().map(|x| get(x, "header").unwrap_or_default()).collect();
        w.open("div", "scr-cols", &[]);
        w.open("div", "scr-main", &[("data-kids", "")]);
        kids(w, &main);
        w.close("div");
        w.open("aside", "scr-side", &[("aria-label", &names.join(", "))]);
        kids(w, &side);
        w.close("aside");
        w.close("div");
    } else {
        kids(w, list(b, "blocks"));
    }
    w.close("div");
}
