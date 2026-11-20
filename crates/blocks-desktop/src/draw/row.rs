use blocks::{Row, Toned};
use egui::{RichText, Ui};

use crate::cx::{Cx, Draw};
use crate::text::shown;

pub(super) const DRAW: Option<Draw<Row>> = Some(draw);

fn draw(b: &Row, ui: &mut Ui, cx: &mut Cx<'_>) {
    let look = cx.look;
    let text = |s| shown(s, cx.values(), cx.now);
    ui.horizontal_wrapped(|ui| {
        if let Some(f) = &b.figure {
            cx.art.figure(f, ui);
        }
        ui.vertical(|ui| {
            ui.label(RichText::new(&b.title).color(look.fg(ui)));
            match &b.subtitle {
                Some(Toned::Text(s)) => ui.label(RichText::new(s).color(look.mute(ui))),
                Some(Toned::Label(l)) => ui.label(RichText::new(text(&l.text)).color(look.tone(ui, l.tone.as_ref()))),
                None => return,
            };
        });
        if let Some(v) = &b.value {
            ui.label(RichText::new(text(v)).color(look.mute(ui)));
        }
        if let Some(l) = &b.badge {
            ui.label(RichText::new(text(&l.text)).color(look.tone(ui, l.tone.as_ref())));
        }
    });
    for r in b.rounds.iter().flatten() {
        cx.blocks(ui, r.blocks.as_deref().unwrap_or_default());
    }
}
