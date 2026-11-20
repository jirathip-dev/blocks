use crate::kind::sample::text;
use crate::kind::{Block, Locale, Submit};

listed! { 1: Sheet(Sheet) = "sheet" }

kind! {
    /// A sheet over a screen.
    pub struct Sheet {
        id: Option<String>,
        title: String,
        cancel: Option<String>,
        done: Option<Submit>,
        blocks: Vec<Block>,
        locale: Option<Locale>,
    }
}

pub(super) fn sample() -> Vec<Block> {
    vec![Block::Sheet(Box::new(
        Sheet::new("Add a repo", vec![text("sheet-note", "Pick one")]).id("add"),
    ))]
}
