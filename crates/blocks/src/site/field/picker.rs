use serde_json::Value;

use super::super::{list, shown, W};

pub(super) fn view(w: &mut W<'_>, x: &Value, attrs: &[(&str, &str)]) {
    let value = shown(x.get("value"));
    w.open("select", "", attrs);
    let mut seen: Vec<String> = vec![];
    for o in std::iter::once(x.get("value")).chain(list(x, "options").iter().map(Some)) {
        let o = shown(o);
        if !o.is_empty() && !seen.contains(&o) {
            w.option(&o, &o, o == value);
            seen.push(o);
        }
    }
    w.close("select");
}
