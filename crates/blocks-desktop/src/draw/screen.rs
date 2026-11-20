use blocks::Screen;
use egui::{Button, RichText, Ui};

use crate::act;
use crate::cx::{Cx, Draw};

pub(super) const DRAW: Option<Draw<Screen>> = Some(draw);

fn draw(b: &Screen, ui: &mut Ui, cx: &mut Cx<'_>) {
    if let Some(t) = &b.title {
        ui.heading(RichText::new(t).color(cx.look.fg(ui)));
    }
    let acts = b.actions.as_deref().unwrap_or_default();
    if !acts.is_empty() {
        ui.horizontal_wrapped(|ui| {
            for a in acts {
                let action = a.tap.as_ref().map_or(a.action.as_deref(), |t| t.action.as_deref());
                let key = action.unwrap_or(&a.label);
                let on = cx.act_on(action);
                if !act::press_as(ui, cx, Some(key), on, action, Button::new(&a.label)) {
                    continue;
                }
                match (&a.tap, &a.action) {
                    (Some(t), _) => act::tap(ui, cx, t),
                    (None, Some(x)) => act::send(cx, x, a.values.clone().unwrap_or_default()),
                    (None, None) => {}
                }
            }
        });
    }
    cx.blocks(ui, b.blocks.as_deref().unwrap_or_default());
}
