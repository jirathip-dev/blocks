use serde_json::Value;

use crate::behave;
use crate::site::write::{fields, get, list, on, shown, Go, W};

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    let cls = if b.get("submit").is_some_and(Value::is_object) {
        "form say"
    } else {
        "form"
    };
    form_of(w, b, cls, false);
}

pub(super) fn form_of(w: &mut W<'_>, b: &Value, cls: &str, bar: bool) {
    let submit = b.get("submit").filter(|s| s.is_object());
    w.open_block("div", cls, b, &[]);
    let action = submit.and_then(|s| get(s, "action")).or_else(|| get(b, "action"));
    let f = action.map(|a| w.post(b.get("id"), a, &fields(&[submit.and_then(|s| s.get("values"))])));
    let owner = f.clone().unwrap_or_default();
    let tie: &[(&str, &str)] = if f.is_some() { &[("form", &owner)] } else { &[] };
    for x in list(b, "fields").iter().filter(|x| x.is_object()) {
        field(w, x, tie);
    }
    if let (Some(s), Some(f)) = (submit, f) {
        if bar {
            w.open("div", "bar", &[]);
        }
        let off: &[(&str, &str)] = if bar && on(s, "off") { &[("disabled", "")] } else { &[] };
        w.btn(
            &shown(s.get("label")),
            "",
            &Go::Post(f, action.unwrap_or_default().into()),
            off,
            None,
        );
        if bar {
            w.close("div");
        }
    }
    w.close("div");
}

fn note(x: &Value) -> (&'static str, String) {
    let was = x.get("was").filter(|v| !v.is_null());
    match (get(x, "error").filter(|e| !e.is_empty()), was) {
        (Some(e), _) => ("fn err", e.to_owned()),
        (None, Some(v)) => ("fn was", format!("was {}", shown(Some(v)))),
        (None, None) => ("fn", get(x, "doc").unwrap_or_default().to_owned()),
    }
}

fn placeholder(x: &Value, secret: bool) -> &str {
    match (secret && on(x, "set"), get(x, "placeholder")) {
        (true, _) => "set ✓ · type to replace",
        (false, Some(p)) => p,
        (false, None) if secret => "not set",
        (false, None) => "",
    }
}

fn input_type<'a>(secret: bool, kb: &str, hints: &'a [(&'static str, String)]) -> &'a str {
    let typed = hints.iter().find(|(k, _)| *k == "type").map(|(_, v)| v.as_str());
    match (secret, kb, typed) {
        (true, _, _) => "password",
        (false, _, Some(t)) => t,
        (false, "url", None) => "url",
        _ => "text",
    }
}

fn field(w: &mut W<'_>, x: &Value, tie: &[(&str, &str)]) {
    let name = shown(x.get("name"));
    let kind = get(x, "type").unwrap_or_default();
    let error = get(x, "error").filter(|e| !e.is_empty());
    let (note_cls, note) = note(x);
    let row = format!(
        "fd{}{}{}",
        if kind == "toggle" { " tg" } else { "" },
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
    let value = shown(x.get("value"));
    match kind {
        "toggle" => {
            attrs.extend([("type", "checkbox"), ("role", "switch")]);
            if on(x, "value") {
                attrs.push(("checked", ""));
            }
            w.open("input", "", &attrs);
        }
        "picker" => {
            w.open("select", "", &attrs);
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
        t => {
            let secret = t == "secret";
            let hints = behave::hints(x);
            let kb = get(x, "keyboard").unwrap_or_default();
            attrs.extend([("type", input_type(secret, kb, &hints)), ("autocomplete", "off")]);
            attrs.extend(
                hints
                    .iter()
                    .filter(|(k, _)| *k != "type")
                    .map(|(k, v)| (*k, v.as_str())),
            );
            match kb {
                "url" => attrs.push(("inputmode", "url")),
                "number" => attrs.push(("inputmode", "decimal")),
                _ => {}
            }
            attrs.push(("placeholder", placeholder(x, secret)));
            if !secret && !value.is_empty() {
                attrs.push(("value", &value));
            }
            w.open("input", "", &attrs);
        }
    }
    w.close("label");
}
