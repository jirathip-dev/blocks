use serde_json::Number;

use crate::kind::sample::text;
use crate::kind::{Block, TextStyle, Tone};

listed! { 14: Text(Text) = "text" }

kind! {
    /// Text: markdown, or a plain styled line.
    pub struct Text {
        id: Option<String>,
        markdown: Option<String>,
        style: Option<TextStyle>,
        until: Option<String>,
        text: Option<String>,
        size: Option<Number>,
        weight: Option<String>,
        font: Option<String>,
        tone: Option<Tone>,
        center: Option<bool>,
        top: Option<Number>,
    }
}

pub(super) fn sample() -> Vec<Block> {
    vec![text("note", "**Hello**")]
}
