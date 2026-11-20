use crate::kind::{Block, Fields};

listed! { 9: Secret(Secret) = "secret" }

kind! {
    /// A secret's input: its value is never sent back.
    pub struct Secret {
        id: Option<String>,
        name: String,
        action: String,
        label: Option<String>,
        placeholder: Option<String>,
        set: Option<bool>,
        values: Option<Fields>,
    }
}

pub(super) fn sample() -> Vec<Block> {
    vec![Block::Secret(Box::new(
        Secret::new("token", "save-token").id("token").label("API token"),
    ))]
}
