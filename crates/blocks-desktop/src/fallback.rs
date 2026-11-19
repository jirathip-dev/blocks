use std::borrow::Cow;

use blocks::{Block, Fields};
use egui::{RichText, Ui};

use crate::cx::Cx;

fn loose(f: &Fields) -> Vec<Block> {
    f.get("blocks")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default()
}

fn under(b: &Block) -> Cow<'_, [Block]> {
    let typed = match b {
        Block::Screen(s) => s.blocks.as_ref(),
        Block::Sheet(s) => Some(&s.blocks),
        Block::Section(s) => Some(&s.blocks),
        Block::Card(c) => c.blocks.as_ref(),
        Block::App(a) => return loose(&a.more).into(),
        _ => None,
    };
    match (typed, b.more()) {
        (Some(t), _) => t.as_slice().into(),
        (None, Some(m)) => loose(m).into(),
        (None, None) => Cow::Borrowed(&[]),
    }
}

pub(crate) fn draw(b: &Block, name: &str, ui: &mut Ui, cx: &mut Cx<'_>) {
    let app = match b {
        Block::App(a) => a.fallback.as_ref(),
        _ => None,
    };
    let title = app.map_or(name, |f| f.title.as_str());
    let look = cx.look;
    ui.label(RichText::new(title).color(look.mute(ui)));
    if let Some(s) = app.and_then(|f| f.subtitle.as_deref()) {
        ui.label(RichText::new(s).color(look.mute(ui)));
    }
    cx.blocks(ui, &under(b));
}
