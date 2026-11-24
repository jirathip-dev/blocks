use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use super::{Buttons, Fills, LabelCase, LabelRole, Marks, Sections, Surface};

pick!(
    /// The font design every label is set in.
    pub TypeDesign { Default, Mono, Serif }
);

impl TypeDesign {
    /// The rule this value adds to the look's CSS.
    #[must_use]
    pub const fn css(self) -> &'static str {
        match self {
            Self::Default => ":root{font-family:system-ui,-apple-system,\"Segoe UI\",Roboto,sans-serif}",
            Self::Mono => "",
            Self::Serif => ":root{font-family:ui-serif,Georgia,Cambria,serif}",
        }
    }
}

pick!(
    /// The curve every move and fade runs on.
    pub Easing { Standard, Calm, Bouncy }
);

impl Easing {
    /// The CSS timing function this easing draws with.
    #[must_use]
    pub const fn curve(self) -> &'static str {
        match self {
            Self::Standard => "cubic-bezier(0.2, 0, 0, 1)",
            Self::Calm => "cubic-bezier(0.4, 0, 0.2, 1)",
            Self::Bouncy => "cubic-bezier(0.34, 1.3, 0.64, 1)",
        }
    }
}

/// The style.json formats a reader takes: 1, and 2 which adds `space` and `motion`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(try_from = "u8", into = "u8")]
#[cfg_attr(feature = "schema", schemars(inline))]
pub struct Format(u8);

impl TryFrom<u8> for Format {
    type Error = String;

    fn try_from(n: u8) -> Result<Self, String> {
        if matches!(n, 1 | 2) {
            Ok(Self(n))
        } else {
            Err(format!("format {n}: this reader takes 1 and 2"))
        }
    }
}

impl From<Format> for u8 {
    fn from(f: Format) -> Self {
        f.0
    }
}

/// A multiplier of the renderer's own sizes or durations, from 0 to 4; 0 is none at all.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(try_from = "f64", into = "f64")]
#[cfg_attr(feature = "schema", schemars(inline))]
pub struct Scale(f64);

impl Default for Scale {
    fn default() -> Self {
        Self(1.0)
    }
}

impl TryFrom<f64> for Scale {
    type Error = String;

    fn try_from(x: f64) -> Result<Self, String> {
        if (0.0..=4.0).contains(&x) {
            Ok(Self(x))
        } else {
            Err(format!("{x}: a scale is from 0 to 4"))
        }
    }
}

impl From<Scale> for f64 {
    fn from(s: Scale) -> Self {
        s.0
    }
}

/// A label's prefix or suffix: at most 4 marks of punctuation or spaces, never words.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(try_from = "String", into = "String")]
#[cfg_attr(feature = "schema", schemars(inline))]
pub struct Affix(String);

impl TryFrom<String> for Affix {
    type Error = String;

    fn try_from(s: String) -> Result<Self, String> {
        let mark = |c: char| c.is_ascii_punctuation() || c == ' ' || "‹›·•".contains(c);
        if s.chars().count() <= 4 && s.chars().all(mark) {
            Ok(Self(s))
        } else {
            Err(format!("{s:?}: punctuation and spaces only, at most 4"))
        }
    }
}

impl From<Affix> for String {
    fn from(a: Affix) -> Self {
        a.0
    }
}

/// Decoration around a label: a prefix, a suffix and a case.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(deny_unknown_fields)]
pub struct StyleLabel {
    #[serde(default)]
    pub prefix: Affix,
    #[serde(default)]
    pub suffix: Affix,
    #[serde(default)]
    pub case: LabelCase,
}

/// An app's style.json: the type, spacing, radius, motion, easing, surface and button tokens a renderer reads.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(deny_unknown_fields)]
pub struct Style {
    pub format: Format,
    #[serde(rename = "type")]
    pub type_: TypeDesign,
    #[serde(default)]
    pub space: Scale,
    pub radius: Scale,
    #[serde(default)]
    pub motion: Scale,
    #[serde(default)]
    pub easing: Easing,
    pub surface: Surface,
    pub fills: Fills,
    #[serde(default)]
    pub buttons: Buttons,
    pub marks: Marks,
    pub sections: Sections,
    #[cfg_attr(feature = "schema", schemars(with = "BTreeMap<String, StyleLabel>"))]
    pub labels: BTreeMap<LabelRole, StyleLabel>,
}
