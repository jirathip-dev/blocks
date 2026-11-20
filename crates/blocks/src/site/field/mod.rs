use serde_json::Value;

use crate::site::write::{get, on, shown, W};

mod picker;
mod plain;
mod scan;
mod secret;
mod text;
mod toggle;
mod upload;

type View = fn(&mut W<'_>, &Value, &[(&str, &str)]);

const VIEWS: &[(&str, &str, View)] = &[
    ("text", "", text::view),
    ("toggle", " tg", toggle::view),
    ("picker", "", picker::view),
    ("secret", "", secret::view),
    ("upload", " up", upload::view),
    ("scan", " up", scan::view),
];

fn note(w: &W<'_>, x: &Value) -> (&'static str, String) {
    let was = x.get("was").filter(|v| !v.is_null());
    match (get(x, "error").filter(|e| !e.is_empty()), was) {
        (Some(e), _) => ("fn err", e.to_owned()),
        (None, Some(v)) => ("fn was", format!("{} {}", w.locale.word("was"), shown(Some(v)))),
        (None, None) => ("fn", get(x, "doc").unwrap_or_default().to_owned()),
    }
}

pub(super) fn field(w: &mut W<'_>, x: &Value, tie: &[(&str, &str)]) {
    let name = shown(x.get("name"));
    let kind = get(x, "type").unwrap_or_default();
    let plain: View = plain::view;
    let (tg, view) = VIEWS.iter().find(|v| v.0 == kind).map_or(("", plain), |v| (v.1, v.2));
    let error = get(x, "error").filter(|e| !e.is_empty());
    let (note_cls, note) = note(w, x);
    let row = format!(
        "fd{tg}{}{}",
        if error.is_some() { " err" } else { "" },
        if on(x, "open") { " open" } else { "" },
    );
    let hidden = w.view.hidden.contains(&name);
    w.open("label", &row, if hidden { &[("hidden", "")] } else { &[] });
    w.open("span", "fl", &[]);
    w.el(
        "span",
        "fk",
        &get(x, "label").map_or_else(|| name.clone(), String::from),
    );
    w.el("span", note_cls, &note);
    w.close("span");
    let mut attrs: Vec<(&str, &str)> = vec![("name", &name)];
    attrs.extend_from_slice(tie);
    if error.is_some() {
        attrs.push(("aria-invalid", "true"));
    }
    if on(x, "open") {
        attrs.push(("autofocus", ""));
    }
    view(w, x, &attrs);
    w.close("label");
}
