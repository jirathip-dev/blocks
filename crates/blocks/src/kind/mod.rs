use serde::{Deserialize, Serialize};

#[macro_use]
mod macros;
mod core;
mod field;
mod locale;
mod parts;
mod sample;

pub(crate) use core::words as timeline_words;
pub use core::*;
pub use field::*;
pub use locale::{Era, Lang, Locale};
pub use parts::*;
pub use sample::{fixtures, samples};

wire! {
    /// A block of a `type` that is no core kind: an app's own, kept whole.
    pub struct AppBlock {
        #[serde(rename = "type", deserialize_with = "app_kind")]
        kind: String,
        id: Option<String>,
        fallback: Option<Fallback>,
        #[serde(flatten)]
        more: Fields,
    }
}

fn app_kind<'de, D: serde::Deserializer<'de>>(d: D) -> Result<String, D::Error> {
    let kind = String::deserialize(d)?;
    if Block::KINDS.contains(&kind.as_str()) {
        return Err(serde::de::Error::custom(format!(
            "a `{kind}` block that does not fit its kind"
        )));
    }
    Ok(kind)
}
