use crate::kind::sample::text;
use crate::kind::Block;

listed! { 2: Section(Section) = "section" }

kind! {
    /// A titled group of blocks.
    pub struct Section {
        id: Option<String>,
        header: Option<String>,
        footer: Option<String>,
        blocks: Vec<Block>,
        side: Option<bool>,
    }
}

pub(super) fn sample() -> Vec<Block> {
    vec![Block::Section(Box::new(
        Section::new(vec![text("today-note", "Quiet")])
            .id("today")
            .header("Today"),
    ))]
}
