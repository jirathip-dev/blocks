use crate::kind::Block;

listed! { {{at}}: {{Name}}({{Name}}) = "{{name}}" }

kind! {
    /// A labelled line; replace its fields with the kind's own.
    pub struct {{Name}} {
        id: Option<String>,
        label: String,
    }
}

pub(super) fn sample() -> Vec<Block> {
    vec![Block::{{Name}}(Box::new({{Name}}::new("{{Name}}").id("{{name}}")))]
}
