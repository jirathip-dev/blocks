use blocks::theme::LabelRole;
use blocks::Section;
use egui::{RichText, Ui};

use crate::cx::{Cx, Draw};

pub(super) const DRAW: Option<Draw<Section>> = Some(draw);

fn draw(b: &Section, ui: &mut Ui, cx: &mut Cx<'_>) {
    let look = cx.look;
    if let Some(h) = &b.header {
        ui.label(RichText::new(look.label(LabelRole::Section, h)).color(look.mute(ui)));
    }
    cx.blocks(ui, &b.blocks);
    if let Some(f) = &b.footer {
        ui.label(RichText::new(f).small().color(look.mute(ui)));
    }
}
