use serde::{Deserialize, Serialize};

use super::Word;
use crate::expr::Expr;
use crate::kind::{Check, FieldValue};

words!(ToggleLook { Switch, Check });

field! {
    /// An on or off switch; `as: "check"` draws it as a checkbox.
    pub struct ToggleField {
        value: Option<FieldValue>,
        #[serde(rename = "as")]
        look: Option<ToggleLook>,
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
