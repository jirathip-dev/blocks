use blocks::{Row, Shown, Toned};
use egui::{RichText, Ui};

use crate::cx::{Cx, Draw};

pub(super) const DRAW: Option<Draw<Row>> = Some(draw);

fn shown(v: &Shown) -> Option<String> {
    match v {
        Shown::Text(s) => Some(s.clone()),
        Shown::Number(n) => Some(n.to_string()),
        Shown::Get(_) | Shown::Time(_) => None,
    }
}

fn draw(b: &Row, ui: &mut Ui, cx: &mut Cx<'_>) {
    let look = cx.look;
    ui.horizontal_wrapped(|ui| {
        ui.vertical(|ui| {
            ui.label(RichText::new(&b.title).color(look.fg(ui)));
            match &b.subtitle {
                Some(Toned::Text(s)) => ui.label(RichText::new(s).color(look.mute(ui))),
                Some(Toned::Label(l)) => ui.label(RichText::new(&l.text).color(look.tone(ui, l.tone.as_ref()))),
                None => return,
            };
        });
        if let Some(v) = b.value.as_ref().and_then(shown) {
            ui.label(RichText::new(v).color(look.mute(ui)));
        }
        if let Some(l) = &b.badge {
            ui.label(RichText::new(&l.text).color(look.tone(ui, l.tone.as_ref())));
        }
    });
    for r in b.rounds.iter().flatten() {
        cx.blocks(ui, r.blocks.as_deref().unwrap_or_default());
    }
}
