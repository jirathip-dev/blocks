use serde_json::Value;

use crate::site::write::{get, on, shown, W};

pub(super) fn figure(w: &mut W<'_>, m: &Value, hook: Option<&Value>) {
    match hook {
        Some(b) => w.open_block("figure", "media", b, &[]),
        None => w.open("figure", "media", &[]),
    }
    let [src, alt, width, height, poster] = ["src", "alt", "width", "height", "poster"].map(|k| shown(m.get(k)));
    let size = [("width", width.as_str()), ("height", height.as_str())];
    if on(m, "video") {
        let mut at = vec![
            ("src", src.as_str()),
            ("aria-label", alt.as_str()),
            ("controls", ""),
            ("preload", "metadata"),
        ];
        at.extend(size);
        at.extend(m.get("poster").map(|_| ("poster", poster.as_str())));
        w.open("video", "", &at);
        w.close("video");
    } else {
        w.open(
            "img",
            "",
            &[
                &[("src", src.as_str()), ("alt", alt.as_str()), ("loading", "lazy")],
                &size[..],
            ]
            .concat(),
        );
    }
    if let Some(c) = get(m, "caption").filter(|c| !c.is_empty()) {
        w.el("figcaption", "", c);
    }
    w.close("figure");
}

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    figure(w, b, Some(b));
}
