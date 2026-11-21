use blocks::{Row, Toned};
use egui::{RichText, Ui};

use crate::cx::{Cx, Draw};
use crate::text::shown;
use crate::words;

pub(super) const DRAW: Option<Draw<Row>> = Some(draw);

fn draw(b: &Row, ui: &mut Ui, cx: &mut Cx<'_>) {
    let look = cx.look;
    let text = |s| shown(s, cx.values(), cx.now);
    ui.horizontal_wrapped(|ui| {
        if let Some(f) = &b.figure {
            cx.art.figure(f, ui);
        }
        ui.vertical(|ui| {
            words::label(ui, RichText::new(&b.title).color(look.fg(ui)));
            if let Some(s) = &b.subtitle {
                toned(ui, cx, s);
            }
        });
        if let Some(v) = &b.value {
            words::label(ui, RichText::new(text(v)).color(look.mute(ui)));
        }
        if let Some(l) = &b.badge {
            words::label(ui, RichText::new(text(&l.text)).color(look.tone(ui, l.tone.as_ref())));
        }
    });
    for r in b.rounds.iter().flatten() {
        cx.blocks(ui, r.blocks.as_deref().unwrap_or_default());
    }
}

pub(super) fn toned(ui: &mut Ui, cx: &Cx<'_>, s: &Toned) {
    let look = cx.look;
    match s {
        Toned::Text(s) => words::label(ui, RichText::new(s).color(look.mute(ui))),
        Toned::Label(l) => {
            words::label(ui, RichText::new(shown(&l.text, cx.values(), cx.now)).color(look.tone(ui, l.tone.as_ref())))
        }
    };
}
