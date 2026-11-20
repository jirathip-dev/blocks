use serde_json::Number;

use crate::site::write::W;
use crate::{Mark, MarkKind, Media};

const TONES: [&str; 6] = ["ok", "warn", "bad", "info", "accent", "ink"];

fn xy(p: &[Number]) -> Option<(f64, f64)> {
    match p {
        [x, y] => Some((x.as_f64()?, y.as_f64()?)),
        _ => None,
    }
}

fn tone(m: &Mark) -> String {
    let t = serde_json::to_value(&m.tone).ok();
    let t = t.as_ref().and_then(serde_json::Value::as_str).unwrap_or_default();
    if TONES.contains(&t) {
        format!(" mk-{t}")
    } else {
        String::new()
    }
}

fn both(out: &mut String, tag: &str, attrs: &str) {
    for cls in ["mkh", "mki"] {
        out.push_str(&format!(r#"<{tag} {attrs} class="{cls}"/>"#));
    }
}

fn shape(out: &mut String, m: &Mark, w: f64, h: f64) {
    let Some((ax, ay)) = xy(&m.at) else { return };
    let (tx, ty) = m.to.as_deref().and_then(xy).unwrap_or((ax, ay));
    let (x1, y1, x2, y2) = (ax * w, ay * h, tx * w, ty * h);
    let r = format!(
        r#"x="{}" y="{}" width="{}" height="{}""#,
        x1.min(x2),
        y1.min(y2),
        (x2 - x1).abs(),
        (y2 - y1).abs()
    );
    out.push_str(&format!(
        r#"<g class="mkd{}{}">"#,
        tone(m),
        if m.fixed == Some(true) { " fixed" } else { "" }
    ));
    if let Some(path) = &m.path {
        let pts: Vec<String> = path
            .iter()
            .filter_map(|p| xy(p))
            .map(|(x, y)| format!("{},{}", x * w, y * h))
            .collect();
        both(out, "polyline", &format!(r#"points="{}""#, pts.join(" ")));
    } else {
        match m.kind {
            MarkKind::Line | MarkKind::Arrow => {
                both(out, "line", &format!(r#"x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}""#));
            }
            MarkKind::Box => both(out, "rect", &r),
            MarkKind::Highlight => {
                out.push_str(&format!(r#"<rect {r} class="mkl"/>"#));
            }
            MarkKind::Ellipse => both(
                out,
                "ellipse",
                &format!(
                    r#"cx="{}" cy="{}" rx="{}" ry="{}""#,
                    f64::midpoint(x1, x2),
                    f64::midpoint(y1, y2),
                    (x2 - x1).abs() / 2.0,
                    (y2 - y1).abs() / 2.0
                ),
            ),
            _ => {}
        }
    }
    if m.kind == MarkKind::Arrow && m.path.is_none() {
        let (a, len) = ((y2 - y1).atan2(x2 - x1), w.max(h) * 0.025);
        let (bx, by) = (x2 - len * a.cos(), y2 - len * a.sin());
        let (s, c) = (len / 2.0 * a.sin(), len / 2.0 * a.cos());
        both(
            out,
            "polygon",
            &format!(r#"points="{x2},{y2} {},{} {},{}""#, bx + s, by - c, bx - s, by + c),
        );
    }
    out.push_str("</g>");
}

fn label(w: &mut W<'_>, m: &Mark) {
    let Some((x, y)) = xy(&m.at) else { return };
    if !matches!(m.kind, MarkKind::Pin | MarkKind::Text) {
        return;
    }
    let style = format!("left:{}%;top:{}%", x * 100.0, y * 100.0);
    w.open(
        "span",
        &format!("mkla{}", tone(m)),
        &[("aria-hidden", "true"), ("style", &style)],
    );
    let text = m.text.as_deref().unwrap_or_default();
    if m.kind == MarkKind::Pin {
        w.el("i", "mkpd", "");
        if !text.is_empty() {
            w.el("span", "mkn", text);
        }
    } else {
        w.el("span", "mkt", text);
    }
    w.close("span");
}

pub(super) fn alt(m: &Media) -> String {
    let marks = m.marks.as_deref().unwrap_or_default();
    let names: Vec<String> = marks.iter().filter_map(|x| m.named(&x.id)).collect();
    format!("{}. {} marks: {}", m.alt, marks.len(), names.join("; "))
}

pub(super) fn drawn(w: &mut W<'_>, m: &Media, img: &[(&str, &str)]) {
    let (pw, ph) = (f64::from(m.width), f64::from(m.height));
    w.open("div", "mkw", &[("style", &format!("width:min(100%, {}px)", m.width))]);
    w.open(
        "div",
        "mkz",
        &[("style", &format!("aspect-ratio:{} / {}", m.width, m.height))],
    );
    w.open("img", "", img);
    let mut svg = format!(
        r#"<svg class="mkv" viewBox="0 0 {} {}" preserveAspectRatio="none" aria-hidden="true">"#,
        m.width, m.height
    );
    for x in m.marks.as_deref().unwrap_or_default() {
        shape(&mut svg, x, pw, ph);
    }
    svg.push_str("</svg>");
    w.raw(&svg);
    w.open("div", "mko", &[]);
    for x in m.marks.as_deref().unwrap_or_default() {
        label(w, x);
    }
    w.close("div");
    w.close("div");
    w.close("div");
}
