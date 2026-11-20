use crate::kind::{Block, LineError};

listed! { 18: Editor(Editor) = "editor" }

kind! {
    /// A text editor and its errors.
    pub struct Editor {
        id: Option<String>,
        name: String,
        text: String,
        action: String,
        first: Option<u32>,
        errors: Option<Vec<LineError>>,
    }
}

pub(super) fn sample() -> Vec<Block> {
    vec![Block::Editor(Box::new(
        Editor::new("notes", "hello", "save-notes").id("editor"),
    ))]
}
