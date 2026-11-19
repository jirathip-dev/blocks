use serde_json::Value;

use super::fallback_as;
use crate::site::write::{get, W};

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    let tag = get(b, "name").filter(|n| {
        n.starts_with(|c: char| c.is_ascii_lowercase())
            && n.contains('-')
            && n.chars()
                .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || "-._".contains(c))
    });
    let props = b.get("props").filter(|p| !p.is_null()).map(Value::to_string);
    let attrs: Vec<(&str, &str)> = props.as_deref().map(|p| ("data-props", p)).into_iter().collect();
    fallback_as(w, b, tag.unwrap_or("div"), &attrs);
}
