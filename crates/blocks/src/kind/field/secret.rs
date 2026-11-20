use serde::{Deserialize, Serialize};

use super::Word;
use crate::expr::Expr;
use crate::kind::{Check, Fields};

field! {
    /// A password input: its value is never drawn back, and an empty one is not sent.
    pub struct SecretField {
        placeholder: Option<String>,
        set: Option<bool>,
    }
}

impl SecretField {
    /// Its role in the drawn tree.
    pub const ROLE: &str = "textbox";

    /// The words it draws itself.
    pub const WORDS: &[Word] = &[
        ("set", "set ✓ · type to replace", "ตั้งไว้แล้ว ✓ · พิมพ์เพื่อแทนที่"),
        ("unset", "not set", "ยังไม่ได้ตั้ง"),
    ];

    #[cfg(feature = "schema")]
    pub(crate) fn sample() -> Self {
        SecretField::new("key").label("API key").set(true)
    }
}
