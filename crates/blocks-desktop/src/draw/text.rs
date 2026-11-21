use blocks::{Text, TextStyle};
use egui::{RichText, Ui};

use crate::cx::{Cx, Draw};
use crate::words;

pub(super) const DRAW: Option<Draw<Text>> = Some(draw);

fn draw(b: &Text, ui: &mut Ui, cx: &mut Cx<'_>) {
    let Some(s) = b.markdown.as_ref().or(b.text.as_ref()) else {
        return;
    };
    let mut t = RichText::new(s).color(cx.look.tone(ui, b.tone.as_ref()));
    if b.style == Some(TextStyle::Footnote) {
        t = t.small();
    }
    words::label(ui, t);
}
