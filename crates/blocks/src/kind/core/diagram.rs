use std::collections::BTreeMap;

use serde_json::Number;

use crate::kind::{Block, Nodes};

listed! { 20: Diagram(Diagram) = "diagram" }

kind! {
    /// A diagram from its source, with counts and its nodes.
    pub struct Diagram {
        id: Option<String>,
        title: Option<String>,
        source: String,
        selected: Option<String>,
        counts: Option<BTreeMap<String, Number>>,
        nodes: Option<Nodes>,
    }
}

pub(super) fn sample() -> Vec<Block> {
    vec![Block::Diagram(Box::new(
        Diagram::new("[*] --> a\na --> b").id("flow").title("Flow"),
    ))]
}
