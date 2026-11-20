use crate::kind::sample::field;
use crate::kind::{Block, Field, Submit};

listed! { 7: Form(Form) = "form", 8: Config(Form) = "config" }

kind! {
    /// A form of fields; also the `config` kind.
    pub struct Form {
        id: Option<String>,
        submit: Option<Submit>,
        action: Option<String>,
        fields: Vec<Field>,
        #[serde(rename = "more")]
        next: Option<String>,
    }
}

pub(super) fn sample() -> Vec<Block> {
    vec![
        Block::Form(Box::new(
            Form::new(vec![field("email", "Email")]).id("signup").action("sign-up"),
        )),
        Block::Config(Box::new(
            Form::new(vec![field("repo", "Repo")]).id("settings").action("save"),
        )),
    ]
}
