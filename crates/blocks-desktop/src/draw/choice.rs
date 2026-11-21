use blocks::Choice;
use egui::{Button, RichText, TextEdit, Ui};
use serde_json::Value;

use crate::act;
use crate::cx::{Cx, Draw};
use crate::text::age;
use crate::words;

pub(super) const DRAW: Option<Draw<Choice>> = Some(draw);

fn draw(b: &Choice, ui: &mut Ui, cx: &mut Cx<'_>) {
    let look = cx.look;
    if let Some(q) = &b.question {
        words::label(ui, RichText::new(q).strong().color(look.fg(ui)));
    }
    let mut opts: Vec<_> = b.options.iter().collect();
    opts.sort_by_key(|o| Some(&o.value) != b.recommended.as_ref());
    ui.horizontal_wrapped(|ui| {
        for o in opts {
            let best = Some(&o.value) == b.recommended.as_ref();
            let label = if best { format!("{} · recommended", o.label) } else { o.label.clone() };
            if act::press(ui, cx, Some(&b.action), Button::new(label)) {
                let mut values = b.values.clone().unwrap_or_default();
                values.extend(o.values.clone().unwrap_or_default());
                values.insert("choice".into(), o.value.clone().into());
                act::send(cx, &b.action, values);
            }
        }
    });
    if let Some(d) = &b.default {
        let t = blocks::Time {
            until: Some(d.until.clone()),
            label: d.label.clone(),
            since: None,
        };
        words::label(ui, RichText::new(age(&t, cx.now)).color(look.mute(ui)));
    }
    let Some(other) = &b.other else { return };
    let id = ui.scope_id().with("other");
    let mut text: String = ui.data_mut(|d| d.get_temp(id)).unwrap_or_default();
    let sent = ui.horizontal(|ui| {
        let hint = other.placeholder.as_deref().unwrap_or("other…");
        ui.add_enabled(cx.on, TextEdit::singleline(&mut text).hint_text(hint));
        act::press(ui, cx, Some(&b.action), Button::new("send")) && !text.trim().is_empty()
    });
    if sent.inner {
        let mut values = b.values.clone().unwrap_or_default();
        values.insert("choice".into(), other.r#for.clone().unwrap_or_default().into());
        values.insert("other".into(), Value::from(std::mem::take(&mut text)));
        act::send(cx, &b.action, values);
    }
    ui.data_mut(|d| d.insert_temp(id, text));
}
