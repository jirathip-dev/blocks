use serde_json::{Map, Value};

use crate::site::write::{list, W};

pub(super) fn fallback_as(w: &mut W<'_>, b: &Value, tag: &str, attrs: &[(&str, &str)]) {
    let mut all = vec![("data-fallback", "")];
    all.extend_from_slice(attrs);
    w.open_block(tag, "", b, &all);
    let f = b.get("fallback").filter(|f| !f.is_null());
    let title = f.map_or_else(|| b.get("type"), |f| f.get("title"));
    if let Some(t) = title.filter(|t| !t.is_null()) {
        let mut r = Map::from_iter([("type".into(), Value::from("row")), ("title".into(), t.clone())]);
        for k in ["subtitle", "tap"] {
            r.extend(f.and_then(|f| f.get(k)).map(|v| (k.into(), v.clone())));
        }
        super::row::row_of(w, &Value::Object(r), false);
    }
    super::kids(w, list(b, "blocks"));
    w.close(tag);
}
