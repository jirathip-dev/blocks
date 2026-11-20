use blocks::{Field, Fields, Form, SecretField};
use egui::{vec2, Button, Checkbox, ComboBox, Response, RichText, TextEdit, Ui};
use serde_json::Value;

use crate::act;
use crate::cx::{Cx, Draw};

pub(super) const DRAW: Option<Draw<Form>> = Some(draw);

macro_rules! each {
    ($f:expr, $x:ident => $e:expr) => {
        match $f {
            Field::Text($x) => $e,
            Field::Toggle($x) => $e,
            Field::Picker($x) => $e,
            Field::Secret($x) => $e,
            Field::Upload($x) => $e,
            Field::Scan($x) => $e,
            Field::Other($x) => $e,
        }
    };
}

fn blank(v: &Value) -> bool {
    match v {
        Value::Null | Value::Bool(false) => true,
        Value::String(s) => s.trim().is_empty(),
        _ => false,
    }
}

pub(super) fn hush(ui: &mut Ui, cx: &mut Cx<'_>, key: &str, on: bool, hint: &str) -> (Response, String) {
    let id = ui.scope_id().with(("hush", key));
    let mut text: String = ui.data_mut(|d| d.get_temp(id)).unwrap_or_default();
    let edit = TextEdit::singleline(&mut text)
        .password(true)
        .hint_text(hint)
        .desired_width(ui.available_width());
    let r = ui.add_enabled(on, edit);
    cx.rec.field(key, r.rect, on);
    ui.data_mut(|d| d.insert_temp(id, text.clone()));
    (r, text)
}

pub(super) fn forget(ui: &Ui, key: &str) {
    ui.data_mut(|d| d.remove::<String>(ui.scope_id().with(("hush", key))));
}

fn note(f: &Field, ui: &Ui, cx: &Cx<'_>) -> Option<RichText> {
    let name = f.name();
    let edited = cx.held(name).is_some_and(|v| !v.is_null());
    let (error, was, doc) = each!(f, x => (x.error.as_deref(), x.was.as_deref(), x.doc.as_deref()));
    let bad = error.or_else(|| cx.say(name).filter(|_| edited));
    let look = cx.look;
    if let Some(e) = bad {
        return Some(RichText::new(e).color(look.tone(ui, Some(&blocks::Tone::Bad))));
    }
    was.map(|w| format!("was {w}"))
        .or_else(|| doc.map(String::from))
        .map(|t| RichText::new(t).color(look.mute(ui)))
}

fn input(f: &Field, ui: &mut Ui, cx: &mut Cx<'_>, on: bool) -> (Response, Value) {
    let name = f.name();
    let held = cx.held(name).unwrap_or(&Value::Null);
    let text = held.as_str().map_or_else(|| if held.is_null() { String::new() } else { held.to_string() }, String::from);
    let (r, v) = match f {
        Field::Toggle(_) => {
            let mut v = held.as_bool().unwrap_or_default();
            (ui.add_enabled(on, Checkbox::without_text(&mut v)), Value::Bool(v))
        }
        Field::Picker(p) => {
            let mut v = text.clone();
            let opts = p.options.iter().flatten().filter(|o| **o != text);
            let opts: Vec<&String> = std::iter::once(&text).chain(opts).filter(|o| !o.is_empty()).collect();
            let r = ui.add_enabled_ui(on, |ui| {
                let c = ComboBox::from_id_salt(name).selected_text(text.as_str());
                c.show_ui(ui, |ui| {
                    for o in opts {
                        ui.selectable_value(&mut v, o.clone(), o);
                    }
                })
            });
            let mut r = r.inner.response;
            if v != text {
                r.mark_changed();
            }
            (r, Value::from(v))
        }
        Field::Secret(s) => return secret(s, ui, cx, on),
        Field::Text(_) | Field::Upload(_) | Field::Scan(_) | Field::Other(_) => {
            let mut v = text;
            let hint = match f {
                Field::Text(t) => t.placeholder.as_deref(),
                _ => None,
            };
            let edit = TextEdit::singleline(&mut v)
                .hint_text(hint.unwrap_or_default())
                .desired_width(ui.available_width());
            let r = ui.add_enabled(on, edit);
            cx.rec.field(name, r.rect, on);
            (r, Value::from(v))
        }
    };
    if r.changed() {
        act::pick(cx, name, v.clone());
    }
    (r, v)
}

fn secret(s: &SecretField, ui: &mut Ui, cx: &mut Cx<'_>, on: bool) -> (Response, Value) {
    let word = |k: &str| SecretField::WORDS.iter().find(|w| w.0 == k).map_or("", |w| w.1);
    let hint = if s.set == Some(true) { word("set") } else { s.placeholder.as_deref().unwrap_or(word("unset")) };
    let (r, text) = hush(ui, cx, &s.name, on, hint);
    (r, if text.is_empty() { Value::Null } else { Value::from(text) })
}

fn draw(b: &Form, ui: &mut Ui, cx: &mut Cx<'_>) {
    let look = cx.look;
    let checked = b.fields.iter().any(|f| cx.say(f.name()).is_some());
    let open = if checked { cx.up } else { cx.on };
    if b.fields.is_empty() && b.submit.is_none() {
        ui.allocate_space(vec2(ui.available_width(), ui.spacing().interact_size.y));
    }
    let live = b.action.as_deref().filter(|_| b.submit.is_none());
    let mut values = Fields::new();
    for f in &b.fields {
        let name = f.name();
        if cx.hidden(name) {
            continue;
        }
        let label = each!(f, x => x.label.as_deref()).unwrap_or(name);
        ui.label(RichText::new(label).color(look.fg(ui)));
        let (r, v) = input(f, ui, cx, open && !cx.off(name));
        if let Some(n) = note(f, ui, cx) {
            ui.label(n);
        }
        let typed = !matches!(f, Field::Toggle(_) | Field::Picker(_));
        if let Some(me) = cx.me.filter(|_| typed) {
            cx.rec.field(me, r.rect, open);
        }
        let commit = if typed { r.lost_focus() } else { r.changed() };
        if let Some(a) = live.filter(|_| commit && !blank(&v)) {
            forget(ui, name);
            act::send(cx, a, Fields::from_iter([(name.to_owned(), v.clone())]));
        }
        if !v.is_null() {
            values.insert(name.into(), v);
        }
    }
    let Some(s) = &b.submit else { return };
    let on = cx.on && s.off != Some(true);
    let (me, label) = (cx.me, Button::new(&s.label));
    if act::press_as(ui, cx, me, on, Some(&s.action), label) && !values.values().all(blank) {
        b.fields.iter().for_each(|f| forget(ui, f.name()));
        let mut all = s.values.clone().unwrap_or_default();
        all.extend(values);
        act::send(cx, &s.action, all);
    }
}
