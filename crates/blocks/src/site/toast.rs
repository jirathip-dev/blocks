use serde_json::Value;

use super::{fallback, get, W};

pub(super) fn toast(w: &mut W<'_>, b: &Value) {
    let Some(title) = get(b, "title").filter(|t| !t.is_empty()) else {
        return fallback(w, b);
    };
    let (tone, glyph) = match get(b, "tone") {
        Some("ok") => ("ok", "✓"),
        Some("warn") => ("warn", "!"),
        Some("bad") => ("bad", "×"),
        _ => ("", ""),
    };
    w.open_block("div", format!("tst inl {tone}").trim_end(), b, &[]);
    w.open("i", "tsg", &[("aria-hidden", "true")]);
    w.text(glyph);
    w.close("i");
    w.el("span", "tsx", title);
    w.close("div");
}
