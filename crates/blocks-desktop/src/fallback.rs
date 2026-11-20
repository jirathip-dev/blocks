use blocks::{Block, Fields};
use egui::{RichText, Ui};

use crate::cx::Cx;

fn loose(f: &Fields) -> Vec<Block> {
    f.get("blocks")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default()
}

fn under(b: &Block) -> Vec<Block> {
    let more = match b {
        Block::App(a) => Some(&a.more),
        _ => b.more(),
    };
    more.map(loose).unwrap_or_default()
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
