use serde::{Deserialize, Serialize};

use super::Check;
use crate::expr::Expr;

mod picker;
mod scan;
mod search;
mod secret;
mod slider;
mod text;
mod toggle;
mod upload;

pub use picker::PickerField;
pub use scan::ScanField;
pub use search::SearchField;
pub use secret::SecretField;
pub use slider::{Num, SliderField};
pub use text::TextField;
pub use toggle::ToggleField;
pub use upload::{Accept, FileRef, UploadField};

/// One word a field draws itself: its key, then English and Thai.
pub type Word = (&'static str, &'static str, &'static str);

const ROW_WORDS: &[Word] = &[("was", "was", "เดิม")];

fields! {
    Text(TextField) = "text",
    Toggle(ToggleField) = "toggle",
    Picker(PickerField) = "picker",
    Secret(SecretField) = "secret",
    Search(SearchField) = "search",
    Upload(UploadField) = "upload",
    Scan(ScanField) = "scan",
    Slider(SliderField) = "slider",
}

field! {
    /// A field of a type this version does not know: kept whole, drawn as a one-line text input.
    pub struct OtherField {
        #[serde(rename = "type", deserialize_with = "other_type")]
        kind: String,
    }
}

fn other_type<'de, D: serde::Deserializer<'de>>(d: D) -> Result<String, D::Error> {
    let kind = String::deserialize(d)?;
    if Field::TYPES.contains(&kind.as_str()) {
        return Err(serde::de::Error::custom(format!(
            "a `{kind}` field that does not fit its type"
        )));
    }
    Ok(kind)
}
