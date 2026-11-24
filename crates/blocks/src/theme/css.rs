use super::finish::write;
use super::{At, Finish, PerMode, Scheme, Style, AXES, DEFAULT_STYLE};

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
    let mut out = style.type_.css().to_owned();
    for rule in AXES.iter().flat_map(|a| (a.of)(style)) {
        out.push_str(&rule.css());
    }
    for (role, label) in &style.labels {
        let on = Finish::Label(*role);
        out.push_str(&write(on, At::Part, &format!("text-transform:{}", label.case.css())));
        for (at, affix) in [(At::Before, &label.prefix), (At::After, &label.suffix)] {
            let text = String::from(affix.clone());
            if !text.is_empty() {
                let text = text.replace('\\', "\\\\").replace('"', "\\\"");
                out.push_str(&write(on, at, &format!("content:\"{text}\"")));
            }
        }
    }
    out
}
