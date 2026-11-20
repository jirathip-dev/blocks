use serde_json::Value;

use crate::site::write::{get, link, list, Go, W};

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    let title = get(b, "title").filter(|t| !t.is_empty()).unwrap_or("Document");
    let all = list(b, "pages");
    let n = all.len();
    let size = |p: &Value, k: &str| p.get(k).and_then(Value::as_u64).unwrap_or(0);
    let widest = all.iter().map(|p| size(p, "width")).max().unwrap_or(0).max(1);
    w.open_block("section", "dcs", b, &[]);
    w.open("div", "dch", &[]);
    w.el("b", "dct", title);
    let count = match n {
        0 => "no pages".to_string(),
        1 => "1 page".to_string(),
        _ => format!("{n} pages"),
    };
    w.el("span", "dcc", &count);
    if let Some(file) = link(b, "file") {
        let name = format!("download {title} as PDF");
        w.open("div", "dcb", &[]);
        w.btn("pdf", "", &Go::Url(file.into()), &[("aria-label", &name)], None);
        w.close("div");
    }
    w.close("div");
    if let Some(note) = get(b, "note").filter(|t| !t.is_empty()) {
        w.el("p", "dcn", note);
    }
    if n == 0 {
        w.el("div", "dce", "No pages yet");
        return w.close("section");
    }
    let region = format!("{title}, {n} pages");
    w.open("div", "dcw", &[("role", "region"), ("aria-label", &region)]);
    w.open("div", "dck", &[]);
    for (i, p) in all.iter().enumerate() {
        let (wd, ht) = (size(p, "width"), size(p, "height"));
        let pw = u32::try_from(wd).map_or(1.0, f64::from) / u32::try_from(widest).map_or(1.0, f64::from);
        w.open("figure", "dc", &[("style", &format!("--pw:{pw};--a:{wd} / {ht}"))]);
        let alt = format!("Page {} of {n}. {}", i + 1, get(p, "alt").unwrap_or_default());
        let (wd, ht, src) = (wd.to_string(), ht.to_string(), link(p, "src").unwrap_or_default());
        let at = [
            ("src", src),
            ("alt", &alt),
            ("width", &wd),
            ("height", &ht),
            ("loading", "lazy"),
        ];
        w.open("img", "", &at);
        w.close("figure");
    }
    w.close("div");
    w.close("div");
    w.close("section");
}
