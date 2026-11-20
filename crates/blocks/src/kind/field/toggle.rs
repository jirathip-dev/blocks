use super::Word;
use crate::expr::Expr;
use crate::kind::{Check, FieldValue};

field! {
    /// An on or off switch.
    pub struct ToggleField {
        value: Option<FieldValue>,
    }
}

impl ToggleField {
    /// Its role in the drawn tree.
    pub const ROLE: &str = "switch";

    /// The words it draws itself.
    pub const WORDS: &[Word] = &[];

    #[cfg(feature = "schema")]
    pub(crate) fn sample() -> Self {
        ToggleField::new("ack").label("I agree").value(FieldValue::Flag(true))
    }
}
