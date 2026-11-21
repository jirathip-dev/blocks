use serde_json::Value;

use crate::site::write::{get, W};

fn glyph(state: &str) -> &'static str {
    match state {
        "running" => "↻",
        "done" => "✓",
        "failed" => "✕",
        _ => "•",
    }
}

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    let name = get(b, "name").unwrap_or_default();
    let body = get(b, "body");
    let busy: &[(&str, &str)] = if get(b, "state") == Some("running") {
        &[("aria-busy", "true")]
    } else {
        &[]
    };
    w.open_block("div", if body.is_some() { "tol has" } else { "tol" }, b, busy);
    match body {
        Some(_) => {
            w.open("details", "", &[]);
            w.open("summary", "toh", &[("aria-label", name)]);
        }
        None => w.open("div", "toh", &[]),
    }
    w.open("i", "tog", &[("aria-hidden", "true")]);
    w.text(glyph(get(b, "state").unwrap_or_default()));
    w.close("i");
    w.el("span", "ton b-tool__name", name);
    w.el("span", "tos b-tool__summary", get(b, "summary").unwrap_or_default());
    if let Some(body) = body {
        w.el("span", "toc", "›");
        w.close("summary");
        w.el("pre", "tob b-tool__body", body);
        w.close("details");
    } else {
        w.close("div");
    }
    w.close("div");
}
