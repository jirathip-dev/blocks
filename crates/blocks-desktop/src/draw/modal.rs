use blocks::Modal;
use egui::{RichText, Ui};

use crate::bidi;
use crate::cx::{Cx, Draw};

pub(super) const DRAW: Option<Draw<Modal>> = Some(draw);

fn draw(b: &Modal, ui: &mut Ui, cx: &mut Cx<'_>) {
    bidi::label(ui, RichText::new(&b.title).heading().color(cx.look.fg(ui)));
    cx.blocks(ui, &b.blocks);
}
