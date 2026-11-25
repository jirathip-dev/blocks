use blocks::{Block, Screen};
use egui::{Button, RichText, Ui};

use crate::bidi;
use crate::act;
use crate::cx::{Cx, Draw};

pub(super) const DRAW: Option<Draw<Screen>> = Some(draw);

fn draw(b: &Screen, ui: &mut Ui, cx: &mut Cx<'_>) {
    if let Some(t) = &b.title {
        bidi::label(ui, RichText::new(t).heading().color(cx.look.fg(ui)));
    }
    let acts = b.actions.as_deref().unwrap_or_default();
    if !acts.is_empty() {
        ui.horizontal_wrapped(|ui| {
            for a in acts {
                let action = a.tap.as_ref().map_or(a.action.as_deref(), |t| t.action.as_deref());
                let key = action.unwrap_or(&a.label);
                let on = cx.act_on(action);
                if !act::press_as(ui, cx, Some(key), on, action, Button::new(bidi::text(ui, &a.label))) {
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
    let all = b.blocks.as_deref().unwrap_or_default();
    let aside = |x: &&Block| matches!(x, Block::Section(s) if s.side == Some(true));
    let (side, main): (Vec<&Block>, Vec<&Block>) = all.iter().partition(aside);
    if b.focus == Some(true) || side.is_empty() || main.is_empty() {
        return cx.blocks(ui, all);
    }
    let read: Vec<Block> = main.into_iter().chain(side).cloned().collect();
    cx.blocks(ui, &read);
}
