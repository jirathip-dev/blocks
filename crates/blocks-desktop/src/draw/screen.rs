use blocks::Screen;
use egui::{RichText, Ui};

use crate::cx::{Cx, Draw};

pub(super) const DRAW: Option<Draw<Screen>> = Some(draw);

fn draw(b: &Screen, ui: &mut Ui, cx: &mut Cx<'_>) {
    if let Some(t) = &b.title {
        ui.heading(RichText::new(t).color(cx.look.fg(ui)));
    }
    cx.blocks(ui, b.blocks.as_deref().unwrap_or_default());
}
