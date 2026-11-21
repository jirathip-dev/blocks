use blocks::Modal;
use egui::{RichText, Ui};

use crate::cx::{Cx, Draw};

pub(super) const DRAW: Option<Draw<Modal>> = Some(draw);

fn draw(b: &Modal, ui: &mut Ui, cx: &mut Cx<'_>) {
    ui.heading(RichText::new(&b.title).color(cx.look.fg(ui)));
    cx.blocks(ui, &b.blocks);
}
