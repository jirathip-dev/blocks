use serde_json::Number;

use crate::kind::{Block, Shown, Tile, Tone};

listed! { 13: Stat(Stat) = "stat" }

kind! {
    /// Figures: a list of tiles, or one tile inline.
    pub struct Stat {
        id: Option<String>,
        items: Option<Vec<Tile>>,
        label: Option<String>,
        value: Option<Shown>,
        unit: Option<String>,
        tone: Option<Tone>,
        spark: Option<Vec<Number>>,
    }
}

pub(super) fn sample() -> Vec<Block> {
    vec![Block::Stat(Box::new(
        Stat::new().id("open").label("open").value(Shown::Number(3.into())),
    ))]
}
