use std::sync::OnceLock;

use serde::{Deserialize, Serialize};

/// A colour as `#rrggbb` or `#rrggbbaa`: nothing else parses.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(try_from = "String", into = "String")]
pub struct Hex(String);

impl TryFrom<String> for Hex {
    type Error = String;

    fn try_from(s: String) -> Result<Self, String> {
        let digits = s.strip_prefix('#').unwrap_or_default();
        let ok = matches!(digits.len(), 6 | 8) && digits.bytes().all(|b| b.is_ascii_hexdigit());
        if ok {
            Ok(Self(s.to_ascii_lowercase()))
        } else {
            Err(format!("{s:?}: not #rrggbb or #rrggbbaa"))
        }
    }
}

impl From<Hex> for String {
    fn from(h: Hex) -> Self {
        h.0
    }
}

impl Hex {
    /// The colour as written, `#rrggbb` or `#rrggbbaa`.
    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub(super) fn rgb(&self) -> [f64; 3] {
        let n = self
            .0
            .get(1..7)
            .and_then(|d| u32::from_str_radix(d, 16).ok())
            .unwrap_or_default();
        [n >> 16, (n >> 8) & 255, n & 255].map(f64::from)
    }
}

/// The appearance a scheme serves.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Mode {
    Dark,
    Light,
}

/// One value for each appearance.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PerMode<T> {
    pub dark: T,
    pub light: T,
}

/// The 19 colour tokens every scheme sets, `--bg` … `--fk-a` on the wire.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Tokens {
    #[serde(rename = "--bg")]
    pub bg: Hex,
    #[serde(rename = "--card")]
    pub card: Hex,
    #[serde(rename = "--edge")]
    pub edge: Hex,
    #[serde(rename = "--line")]
    pub line: Hex,
    #[serde(rename = "--scrim")]
    pub scrim: Hex,
    #[serde(rename = "--fg")]
    pub fg: Hex,
    #[serde(rename = "--mute")]
    pub mute: Hex,
    #[serde(rename = "--l")]
    pub l: Hex,
    #[serde(rename = "--link")]
    pub link: Hex,
    #[serde(rename = "--g")]
    pub g: Hex,
    #[serde(rename = "--a")]
    pub a: Hex,
    #[serde(rename = "--r")]
    pub r: Hex,
    #[serde(rename = "--p")]
    pub p: Hex,
    #[serde(rename = "--c")]
    pub c: Hex,
    #[serde(rename = "--fk-l")]
    pub fk_l: Hex,
    #[serde(rename = "--fk-p")]
    pub fk_p: Hex,
    #[serde(rename = "--fk-c")]
    pub fk_c: Hex,
    #[serde(rename = "--fk-g")]
    pub fk_g: Hex,
    #[serde(rename = "--fk-a")]
    pub fk_a: Hex,
}

impl Tokens {
    /// Every token with its CSS variable name, in the wire's order.
    pub fn all(&self) -> [(&'static str, &Hex); 19] {
        [
            ("--bg", &self.bg),
            ("--card", &self.card),
            ("--edge", &self.edge),
            ("--line", &self.line),
            ("--scrim", &self.scrim),
            ("--fg", &self.fg),
            ("--mute", &self.mute),
            ("--l", &self.l),
            ("--link", &self.link),
            ("--g", &self.g),
            ("--a", &self.a),
            ("--r", &self.r),
            ("--p", &self.p),
            ("--c", &self.c),
            ("--fk-l", &self.fk_l),
            ("--fk-p", &self.fk_p),
            ("--fk-c", &self.fk_c),
            ("--fk-g", &self.fk_g),
            ("--fk-a", &self.fk_a),
        ]
    }
}

/// A colour scheme: the name shown for it, the appearance it serves and its tokens.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Scheme {
    pub label: String,
    #[serde(rename = "color-scheme")]
    pub mode: Mode,
    pub tokens: Tokens,
}

macro_rules! builtin {
    ($($name:literal),* $(,)?) => {
        [$(($name, include_str!(concat!("../../../../theme/schemes/", $name, ".json")))),*]
    };
}

const BUILTIN: [(&str, &str); 12] = builtin!(
    "dracula",
    "farm",
    "farm-light",
    "garden-dark",
    "garden-light",
    "github-dark",
    "gruvbox",
    "kitchen",
    "kitchen-light",
    "nord",
    "paper",
    "solarized-dark",
);

/// The built-in schemes in theme/schemes/, by name.
pub fn schemes() -> &'static [(&'static str, Scheme)] {
    static PARSED: OnceLock<Vec<(&'static str, Scheme)>> = OnceLock::new();
    PARSED.get_or_init(|| {
        BUILTIN
            .iter()
            .filter_map(|(name, text)| Some((*name, serde_json::from_str(text).ok()?)))
            .collect()
    })
}

fn vars(s: &Scheme) -> String {
    s.tokens
        .all()
        .iter()
        .map(|(k, v)| format!("{k}:{};", v.as_str()))
        .collect()
}

/// Every token as a CSS variable: the light scheme on `:root`, the dark one under `prefers-color-scheme: dark`.
pub fn css(schemes: &PerMode<Scheme>) -> String {
    format!(
        ":root{{color-scheme:light dark;{}}}@media (prefers-color-scheme: dark){{:root{{{}}}}}",
        vars(&schemes.light),
        vars(&schemes.dark)
    )
}
