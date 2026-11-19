use serde_json::{Map, Value};

use super::write::{get, list, W};

macro_rules! kinds {
    ($($name:literal => $m:ident,)*) => {
        $(mod $m;)*
        pub(super) fn block(w: &mut W<'_>, b: &Value) {
            match get(b, "type").unwrap_or_default() {
                $($name => $m::draw(w, b),)*
                _ => fallback(w, b),
            }
        }
    };
}

kinds! {
    "screen" => screen,
    "sheet" => sheet,
    "list" => list,
    "section" => section,
    "row" => row,
    "card" => card,
    "choice" => choice,
    "form" => form,
    "config" => config,
    "secret" => secret,
    "run" => run,
    "button" => button,
    "chips" => chips,
    "stat" => stat,
    "text" => text,
    "images" => images,
    "web" => web,
    "composer" => composer,
    "prose" => prose,
    "hero" => hero,
    "media" => media,
    "nav" => nav,
    "diagram" => diagram,
    "editor" => editor,
    "lines" => lines,
    "scene" => scene,
    "island" => island,
    "table" => table,
    "steps" => steps,
}

pub(crate) fn kids(w: &mut W<'_>, bs: &[Value]) {
    for b in bs.iter().filter(|b| b.is_object()) {
        block(w, b);
    }
}

fn holder(w: &mut W<'_>, b: &Value, tag: &str, cls: &str, under: &str) {
    w.open_block(tag, cls, b, &[]);
    kids(w, list(b, under));
    w.close(tag);
}

pub(crate) fn fallback(w: &mut W<'_>, b: &Value) {
    fallback_as(w, b, "div", &[]);
}

fn fallback_as(w: &mut W<'_>, b: &Value, tag: &str, attrs: &[(&str, &str)]) {
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
        row::row_of(w, &Value::Object(r), false);
    }
    kids(w, list(b, "blocks"));
    w.close(tag);
}
