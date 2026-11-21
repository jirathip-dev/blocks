use serde::{Deserialize, Serialize};

use crate::kind::Block;

listed! { 36: Tool(Tool) = "tool" }

words!(ToolState { Running, Done, Failed });

kind! {
    /// One tool call: its name, a one-line summary, its state, and a body shown when it is opened.
    pub struct Tool {
        id: Option<String>,
        name: String,
        state: ToolState,
        summary: Option<String>,
        body: Option<String>,
    }
}

pub(super) fn sample() -> Vec<Block> {
    vec![Block::Tool(Box::new(
        Tool::new("Test", ToolState::Running)
            .id("tool")
            .summary("cargo test -p blocks"),
    ))]
}
