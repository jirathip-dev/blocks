use blocks::Secret;
use egui::{Button, Key, RichText, Ui};

use super::form::{forget, hush};
use crate::bidi;
use crate::act;
use crate::cx::{Cx, Draw};

pub(super) const DRAW: Option<Draw<Secret>> = Some(draw);

fn draw(b: &Secret, ui: &mut Ui, cx: &mut Cx<'_>) {
    let look = cx.look;
    let set = b.set == Some(true);
    let label = b.label.as_deref().unwrap_or(&b.name);
    let label = if set { format!("{label} · set ✓") } else { label.to_owned() };
    bidi::label(ui, RichText::new(label).color(look.fg(ui)));
    let hint = if set { "paste to replace" } else { b.placeholder.as_deref().unwrap_or_default() };
    let (r, text) = hush(ui, cx, &b.name, cx.on, hint);
    if let Some(me) = cx.me {
        cx.rec.field(me, r.rect, cx.on);
    }
    bidi::label(ui, RichText::new("sent to the app only, never to the agent").color(look.mute(ui)));
    let enter = r.lost_focus() && ui.input(|i| i.key_pressed(Key::Enter));
    if (act::press(ui, cx, Some(&b.action), Button::new("send")) || enter) && !text.is_empty() {
        forget(ui, &b.name);
        let mut values = b.values.clone().unwrap_or_default();
        values.insert(b.name.clone(), text.into());
        act::send(cx, &b.action, values);
    }
}
