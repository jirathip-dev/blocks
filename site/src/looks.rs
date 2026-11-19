use blocks::site::Look;
use blocks::theme;
use serde_json::Value;

/// The site's four looks: the name a page stores and the label its switcher shows; the first is the one a page is written in.
pub const NAMES: [(&str, &str); 4] = [
    ("default", "Default"),
    ("paper", "Paper"),
    ("console", "Console"),
    ("playful", "Playful"),
];

/// Each look in `NAMES` from `site/looks.json`: its scheme pair (the crate's default pair when it names none) and its style.
pub fn all() -> Result<Vec<(&'static str, &'static str, Look)>, String> {
    let file: Value = serde_json::from_str(include_str!("../looks.json")).map_err(|e| e.to_string())?;
    NAMES
        .iter()
        .map(|(name, label)| {
            let at = |k: &str| file.get(name).and_then(|l| l.get(k)).cloned();
            let schemes = match at("schemes") {
                Some(s) => serde_json::from_value(s),
                None => Ok(theme::default().clone()),
            };
            let style = serde_json::from_value(at("style").unwrap_or_default());
            let look = Look {
                schemes: schemes.map_err(|e| format!("{name}: {e}"))?,
                style: style.map_err(|e| format!("{name}: {e}"))?,
            };
            Ok((*name, *label, look))
        })
        .collect()
}
