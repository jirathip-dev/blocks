use std::sync::OnceLock;

use serde::{Deserialize, Serialize};

use super::{Easing, Fills, LabelCase, LabelRole, Marks, Sections, Style, Surface, TypeDesign};

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

const DEFAULT_LIGHT: [&str; 19] = [
    "#f6f6f6",
    "#ffffff",
    "#d0d0d0",
    "#e4e4e4",
    "#0000004d",
    "#1c1c1c",
    "#5e5e5e",
    "#3d3d3d",
    "#3d3d3d",
    "#547850",
    "#927236",
    "#a75953",
    "#74678e",
    "#3c797d",
    "#3d3d3d",
    "#64597c",
    "#31666a",
    "#456642",
    "#775d2c",
];

const DEFAULT_DARK: [&str; 19] = [
    "#161616",
    "#1f1f1f",
    "#3a3a3a",
    "#2a2a2a",
    "#00000099",
    "#ececec",
    "#a3a3a3",
    "#d6d6d6",
    "#d6d6d6",
    "#769672",
    "#c5a370",
    "#bb776e",
    "#a295bb",
    "#6da1a5",
    "#d6d6d6",
    "#b8abce",
    "#8ab9bc",
    "#9bb996",
    "#d1b184",
];

/// The built-in default's tile style values as CSS variables, the same in light and dark.
pub const DEFAULT_STYLE: [(&str, &str); 11] = [
    ("--radius", "0px"),
    ("--seam", "2px"),
    ("--dot-size", "2px"),
    ("--dot-gap", "16px"),
    ("--dot", "var(--edge)"),
    ("--settle", "160ms"),
    ("--rise", "8px"),
    ("--stagger", "40ms"),
    ("--build", "200ms"),
    ("--enter", "160ms"),
    ("--ease", Easing::Standard.curve()),
];

fn neutral(label: &str, mode: Mode, hex: &[&str; 19]) -> Scheme {
    let [bg, card, edge, rule, scrim, fg, mute, l, link, g, a, r, p, c, fk_l, fk_p, fk_c, fk_g, fk_a] =
        hex.map(|h| Hex(h.to_owned()));
    let tokens = Tokens {
        bg,
        card,
        edge,
        line: rule,
        scrim,
        fg,
        mute,
        l,
        link,
        g,
        a,
        r,
        p,
        c,
        fk_l,
        fk_p,
        fk_c,
        fk_g,
        fk_a,
    };
    Scheme {
        label: label.to_owned(),
        mode,
        tokens,
    }
}

/// The built-in neutral grey pair, light and dark, for when no theme is supplied.
pub fn default() -> &'static PerMode<Scheme> {
    static PAIR: OnceLock<PerMode<Scheme>> = OnceLock::new();
    PAIR.get_or_init(|| PerMode {
        dark: neutral("Default dark", Mode::Dark, &DEFAULT_DARK),
        light: neutral("Default light", Mode::Light, &DEFAULT_LIGHT),
    })
}

fn vars(s: &Scheme) -> String {
    s.tokens
        .all()
        .iter()
        .map(|(k, v)| format!("{k}:{};", v.as_str()))
        .collect()
}

/// Every token as a CSS variable: the tile style and the light scheme on `:root`, the dark one under `prefers-color-scheme: dark`, then the style's axes.
pub fn css(schemes: &PerMode<Scheme>, style: &Style) -> String {
    let mut tiles: std::collections::BTreeMap<&str, String> =
        DEFAULT_STYLE.iter().map(|(k, v)| (*k, (*v).to_owned())).collect();
    tiles.insert("--radius", format!("{}px", f64::from(style.radius) * 12.0));
    tiles.insert("--ease", style.easing.curve().to_owned());
    format!(
        ":root{{color-scheme:light dark;--space:{};--motion:{};{}{}}}@media (prefers-color-scheme: dark){{:root{{{}}}}}{}",
        f64::from(style.space),
        f64::from(style.motion),
        tiles.iter().map(|(k, v)| format!("{k}:{v};")).collect::<String>(),
        vars(&schemes.light),
        vars(&schemes.dark),
        axes(style)
    )
}

const TILES: &str = ":is(.card,.st,.list>.row,.list>.rw,.form:not(.say),.choice,.secret,.run,.tbl)";

fn axes(style: &Style) -> String {
    let mut out = String::new();
    match style.type_ {
        TypeDesign::Default => {
            out.push_str(":root{font-family:system-ui,-apple-system,\"Segoe UI\",Roboto,sans-serif}");
        }
        TypeDesign::Mono => {}
        TypeDesign::Serif => out.push_str(":root{font-family:ui-serif,Georgia,Cambria,serif}"),
    }
    match style.surface {
        Surface::Glass => {}
        Surface::Dashed => out.push_str(&format!("{TILES}{{border-style:dashed}}")),
        Surface::Solid => out.push_str(&format!("{TILES}{{border-width:2px}}")),
    }
    if style.fills == Fills::Outline {
        out.push_str(
            ".chips button.on,.spi.done .spm{background:none;color:var(--l);box-shadow:inset 0 0 0 1px var(--l)}",
        );
    }
    if style.marks == Marks::Text {
        out.push_str(
            ".spi.done .spm{width:auto;font-size:0}.spi.done .spm::after{content:\"done\";font-size:var(--fs-meta)}",
        );
    }
    if style.sections == Sections::Quiet {
        out.push_str(".sh{font-size:var(--fs-meta);font-weight:400}");
    }
    for (role, label) in &style.labels {
        let Some(at) = drawn(*role) else {
            continue;
        };
        let case = match label.case {
            LabelCase::AsIs => "none",
            LabelCase::Lower => "lowercase",
            LabelCase::Upper => "uppercase",
        };
        out.push_str(&format!("{at}{{text-transform:{case}}}"));
        for (side, affix) in [("before", &label.prefix), ("after", &label.suffix)] {
            let text = String::from(affix.clone());
            if !text.is_empty() {
                let text = text.replace('\\', "\\\\").replace('"', "\\\"");
                out.push_str(&format!("{at}::{side}{{content:\"{text}\"}}"));
            }
        }
    }
    out
}

fn drawn(role: LabelRole) -> Option<&'static str> {
    match role {
        LabelRole::Header => Some(".sec>.sh"),
        LabelRole::Section => Some(":is(.sp,.pg,.scn)>.sh"),
        LabelRole::Title => Some(":is(.ch>b,.rt)"),
        LabelRole::Button => Some(".b-button>span"),
        LabelRole::Chip => Some(".chips button>span"),
        LabelRole::Picked => Some(".dgn.picked .dgl"),
        LabelRole::Kind | LabelRole::Group | LabelRole::Back | LabelRole::Said => None,
    }
}
