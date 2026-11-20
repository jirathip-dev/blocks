use blocks::Sheet;
use egui::{RichText, Ui};

use crate::cx::{Cx, Draw};

pub(super) const DRAW: Option<Draw<Sheet>> = Some(draw);

fn draw(b: &Sheet, ui: &mut Ui, cx: &mut Cx<'_>) {
    ui.heading(RichText::new(&b.title).color(cx.look.fg(ui)));
    cx.blocks(ui, &b.blocks);
}
