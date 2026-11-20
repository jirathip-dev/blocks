use serde::{Deserialize, Serialize};

use super::Word;
use crate::expr::Expr;
use crate::kind::{Check, FieldValue, Fields};

field! {
    /// One of a list of options.
    pub struct PickerField {
        value: Option<FieldValue>,
        options: Option<Vec<String>>,
    }
}

impl PickerField {
    /// Its role in the drawn tree.
    pub const ROLE: &str = "combobox";

    /// The words it draws itself.
    pub const WORDS: &[Word] = &[];

    #[cfg(feature = "schema")]
    pub(crate) fn sample() -> Self {
        PickerField::new("plan")
            .label("Plan")
            .value(FieldValue::Text("team".into()))
            .options(vec!["free".into(), "team".into()])
    }
}
