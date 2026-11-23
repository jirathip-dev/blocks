use super::{LabelRole, PerMode, Scheme, Style, DEFAULT_STYLE};

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

fn axes(style: &Style) -> String {
    let mut out = [
        style.type_.css(),
        style.surface.css(),
        style.fills.css(),
        style.buttons.css(),
        style.marks.css(),
        style.sections.css(),
    ]
    .concat();
    for (role, label) in &style.labels {
        let Some(at) = role.selector() else {
            continue;
        };
        out.push_str(&format!("{at}{{text-transform:{}}}", label.case.css()));
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

impl LabelRole {
    /// The selector a style's decoration of this label lands on; `None` for a label no renderer decorates.
    #[must_use]
    pub const fn selector(self) -> Option<&'static str> {
        match self {
            Self::Header => Some(".sec>.sh"),
            Self::Section => Some(":is(.sp,.pg,.scn)>.sh"),
            Self::Title => Some(":is(.ch>b,.rt)"),
            Self::Button => Some(".b-button>span"),
            Self::Chip => Some(".chips button>span"),
            Self::Picked => Some(".dgn.picked .dgl"),
            Self::Screen => Some(".tabh>.b-screen__title"),
            Self::Kind | Self::Group | Self::Back | Self::Said => None,
        }
    }
}
