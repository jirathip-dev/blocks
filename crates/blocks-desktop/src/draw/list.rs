use blocks::List;
use egui::Ui;

use crate::cx::{Cx, Draw};

pub(super) const DRAW: Option<Draw<List>> = Some(draw);

fn draw(b: &List, ui: &mut Ui, cx: &mut Cx<'_>) {
    cx.blocks(ui, &b.rows);
}
