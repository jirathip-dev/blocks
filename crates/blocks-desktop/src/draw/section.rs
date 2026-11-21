use blocks::theme::LabelRole;
use blocks::Section;
use egui::{RichText, Ui};

use crate::cx::{Cx, Draw};
use crate::words;

pub(super) const DRAW: Option<Draw<Section>> = Some(draw);

fn draw(b: &Section, ui: &mut Ui, cx: &mut Cx<'_>) {
    let look = cx.look;
    if let Some(h) = &b.header {
        let plain = look.label(LabelRole::Section, h);
        let key = h.split(' ').next().unwrap_or_default();
        let said = cx.art.word(key).map_or(plain.clone(), |w| format!("{w} · {plain}"));
        words::label(ui, RichText::new(said).color(look.mute(ui)));
    }
    cx.blocks(ui, &b.blocks);
    if let Some(f) = &b.footer {
        words::label(ui, RichText::new(f).small().color(look.mute(ui)));
    }
}
