use blocks::List;
use egui::{vec2, Ui};

use crate::cx::{Cx, Draw};

pub(super) const DRAW: Option<Draw<List>> = Some(draw);

fn draw(b: &List, ui: &mut Ui, cx: &mut Cx<'_>) {
    if b.rows.is_empty() {
        ui.allocate_space(vec2(ui.available_width(), ui.spacing().interact_size.y));
    }
    cx.blocks(ui, &b.rows);
}
