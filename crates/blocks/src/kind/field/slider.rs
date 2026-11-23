use serde::{Deserialize, Serialize};
use serde_json::Number;

use super::Word;
use crate::expr::Expr;
use crate::kind::Check;

field! {
    /// A number on a track from `min` to `max`: the label over the thumb shows it with its `unit`, and a live form sends it on let go.
    pub struct SliderField {
        min: Num,
        max: Num,
        step: Option<Num>,
        value: Option<Num>,
        unit: Option<String>,
    }
}

/// A number on the wire, as JSON wrote it.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[cfg_attr(feature = "schema", schemars(inline))]
#[serde(transparent)]
pub struct Num(pub Number);

impl Default for Num {
    fn default() -> Self {
        Self(0.into())
    }
}

impl<T: Into<Number>> From<T> for Num {
    fn from(n: T) -> Self {
        Self(n.into())
    }
}

impl Num {
    /// The number as a float.
    #[must_use]
    pub fn get(&self) -> f64 {
        self.0.as_f64().unwrap_or_default()
    }
}

impl SliderField {
    /// Its role in the drawn tree.
    pub const ROLE: &str = "slider";

    /// Where the thumb starts: `value`, else `min`.
    #[must_use]
    pub fn start(&self) -> f64 {
        self.value.as_ref().unwrap_or(&self.min).get()
    }

    /// `n` with only the places it needs: `110`, `7.5`.
    #[must_use]
    pub fn number(n: f64) -> String {
        format!("{}", (n * 1e6).round() / 1e6)
    }

    /// The label over the thumb at `n`: the number, then a no-break space and `unit` when set.
    #[must_use]
    pub fn said(&self, n: f64) -> String {
        match self.unit.as_deref().filter(|u| !u.is_empty()) {
            Some(u) => format!("{}\u{a0}{u}", Self::number(n)),
            None => Self::number(n),
        }
    }

    /// The words it draws itself.
    pub const WORDS: &[Word] = &[];

    #[cfg(feature = "schema")]
    pub(crate) fn sample() -> Self {
        SliderField::new("size", 80, 130)
            .label("Text size")
            .step(5)
            .unit("%")
            .value(110)
    }
}
