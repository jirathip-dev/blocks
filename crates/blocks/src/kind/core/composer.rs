use std::collections::BTreeMap;


use crate::kind::{Block, ComposerChip, Fields, Queued, Working};

listed! { 21: Composer(Composer) = "composer" }

kind! {
    /// A message box: its send action, its chips and the messages queued.
    pub struct Composer {
        id: Option<String>,
        action: String,
        label: Option<String>,
        placeholder: Option<String>,
        acts: Option<BTreeMap<String, String>>,
        chips: Option<Vec<ComposerChip>>,
        queued: Option<Vec<Queued>>,
        values: Option<Fields>,
        working: Option<Working>,
    }
}

pub(super) fn sample() -> Vec<Block> {
    vec![Block::Composer(Box::new(
        Composer::new("say").id("say").placeholder("message the team"),
    ))]
}
