use super::Word;
use crate::expr::Expr;
use crate::kind::{Check, FieldValue, Keyboard};

field! {
    /// A one-line text input.
    pub struct TextField {
        value: Option<FieldValue>,
        placeholder: Option<String>,
        keyboard: Option<Keyboard>,
    }
}

impl TextField {
    /// Its role in the drawn tree.
    pub const ROLE: &str = "textbox";

    /// The words it draws itself.
    pub const WORDS: &[Word] = &[];

    #[cfg(feature = "schema")]
    pub(crate) fn sample() -> Self {
        TextField::new("name")
            .label("Name")
            .value(FieldValue::Text("Ada Lovelace".into()))
            .placeholder("Your name")
    }
}
