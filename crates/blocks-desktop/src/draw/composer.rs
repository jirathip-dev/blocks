use blocks::Composer;
use egui::{Button, Key, Ui};

use crate::{act, bidi};
use crate::cx::{Cx, Draw};

pub(super) const DRAW: Option<Draw<Composer>> = Some(draw);

fn draw(b: &Composer, ui: &mut Ui, cx: &mut Cx<'_>) {
    let id = ui.scope_id().with("draft");
    let mut text: String = ui.data_mut(|d| d.get_temp(id)).unwrap_or_default();
    let hint = bidi::text(ui, b.placeholder.as_deref().unwrap_or_default());
    let width = ui.available_width();
    let r = bidi::area(ui, &mut text, cx.on, |e| e.hint_text(hint).desired_rows(1).desired_width(width));
    if let Some(me) = cx.me {
        cx.rec.field(me, r.rect, cx.on);
    }
    let queue = b.working.as_ref().and(b.acts.as_ref()).and_then(|a| a.get("queue"));
    let label = if queue.is_some() { "queue" } else { b.label.as_deref().unwrap_or("send") };
    let action = queue.unwrap_or(&b.action);
    let keyed = r.has_focus() && ui.input(|i| i.modifiers.command && i.key_pressed(Key::Enter));
    if (act::press(ui, cx, Some(action), Button::new(bidi::text(ui, label))) || keyed) && !text.trim().is_empty() {
        let mut values = b.values.clone().unwrap_or_default();
        values.insert("text".into(), std::mem::take(&mut text).into());
        act::send(cx, action, values);
    }
    ui.data_mut(|d| d.insert_temp(id, text));
}
