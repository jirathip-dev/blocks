use serde_json::Value;

use super::chart::colour;
use super::fallback;
use crate::site::write::W;
use crate::{Plot, PlotAxis, PlotDrawn};

fn num(x: f64) -> String {
    format!("{}", ((x * 100.0) + 0.5).floor() / 100.0 + 0.0)
}

fn px(f: f64) -> String {
    format!("{}", (f * 10000.0 + 0.5).floor() + 0.0)
}

fn axis_label(a: Option<&PlotAxis>) -> String {
    let label = a.and_then(|a| a.label.as_deref()).filter(|s| !s.is_empty());
    let unit = a.and_then(|a| a.unit.as_deref()).filter(|s| !s.is_empty()).map(|u| format!("({u})"));
    label.map(str::to_string).into_iter().chain(unit).collect::<Vec<_>>().join(" ")
}

fn f(v: &serde_json::Number) -> f64 {
    v.as_f64().unwrap_or(0.0)
}

fn legend(w: &mut W<'_>, p: &Plot, d: &PlotDrawn) {
    w.open("div", "pll", &[]);
    for (i, (s, last)) in p.series.iter().zip(&d.last).enumerate() {
        w.open("span", "", &[]);
        w.open("i", "plk", &[("style", &colour(s.tone.as_ref(), i))]);
        w.close("i");
        w.text(&s.name);
        if !last.is_empty() {
            w.el("b", "", last);
        }
        w.close("span");
    }
    if let Some(band) = &d.band {
        w.open("span", "", &[]);
        w.raw("<i class=\"plk band\"></i>Target");
        w.el("b", "", band);
        w.close("span");
    }
    if let Some(peak) = &p.peak {
        w.open("span", "", &[]);
        w.raw("<i class=\"plk peak\"></i>");
        w.el("b", "", &peak.label);
        w.close("span");
    }
    w.close("div");
}

fn marks(w: &mut W<'_>, p: &Plot, d: &PlotDrawn, xf: &dyn Fn(f64) -> f64, yf: &dyn Fn(f64) -> f64) {
    let y0 = d.y.0;
    w.open("div", "plp", &[]);
    w.raw("<svg viewBox=\"0 0 10000 10000\" preserveAspectRatio=\"none\" aria-hidden=\"true\"><g class=\"plgr\">");
    for t in &d.y_ticks {
        let cls = if (t.at - y0).abs() < 1e-9 { "base" } else { "grid" };
        let y = px(yf(t.at));
        w.raw(&format!("<line class=\"{cls}\" x1=\"0\" x2=\"10000\" y1=\"{y}\" y2=\"{y}\"/>"));
    }
    for t in &d.x_ticks {
        let at = xf(t.at);
        if at > 0.001 && at < 0.999 {
            let x = px(at);
            w.raw(&format!("<line class=\"grid\" x1=\"{x}\" x2=\"{x}\" y1=\"0\" y2=\"10000\"/>"));
        }
    }
    w.raw("</g>");
    if let Some(t) = &p.target {
        let (top, bottom) = (yf(f(&t.max)), yf(f(&t.min)));
        let (y, h, lo, hi) = (px(top), px((bottom - top).max(0.0)), px(bottom), px(top));
        w.raw(&format!(
            "<rect class=\"plb\" x=\"0\" width=\"10000\" y=\"{y}\" height=\"{h}\"/><line class=\"plbe\" x1=\"0\" x2=\"10000\" y1=\"{hi}\" y2=\"{hi}\"/><line class=\"plbe\" x1=\"0\" x2=\"10000\" y1=\"{lo}\" y2=\"{lo}\"/>"
        ));
    }
    if let Some(peak) = &p.peak {
        let y = px(yf(f(&peak.y)));
        w.raw(&format!("<line class=\"peak\" x1=\"0\" x2=\"10000\" y1=\"{y}\" y2=\"{y}\"/>"));
    }
    for (i, (s, line)) in p.series.iter().zip(&d.lines).enumerate() {
        let pt = |j: &usize| {
            let at = |v: &[serde_json::Number]| v.get(*j).map_or(0.0, f);
            format!("{} {}", px(xf(at(&s.x))), px(yf(at(&s.y))))
        };
        let path = line.iter().map(pt).collect::<Vec<_>>().join("L");
        let d = if path.is_empty() { path } else { format!("M{path}") };
        let k = colour(s.tone.as_ref(), i);
        w.raw(&format!("<path class=\"s\" d=\"{d}\" style=\"{k}\"/>"));
    }
    w.raw("</svg>");
    for (i, s) in p.series.iter().enumerate() {
        let (Some(x), Some(y)) = (s.x.last().map(f), s.y.last().map(f)) else { continue };
        if (0.0..=1.0001).contains(&xf(x)) {
            let style = format!("left:{}%;top:{}%;{}", num(xf(x) * 100.0), num(yf(y) * 100.0), colour(s.tone.as_ref(), i));
            w.open("i", "pld", &[("style", &style)]);
            w.close("i");
        }
    }
    if p.series.iter().all(|s| s.x.is_empty()) {
        w.open("div", "ple", &[]);
        w.el("span", "", p.empty.as_deref().unwrap_or("No data yet"));
        w.close("div");
    }
    w.close("div");
}

fn x_ticks(w: &mut W<'_>, d: &PlotDrawn, xf: &dyn Fn(f64) -> f64) {
    w.open("div", "plx", &[]);
    for t in &d.x_ticks {
        let at = xf(t.at);
        let edge = match at {
            a if a < 0.001 => "lo",
            a if a > 0.999 => "hi",
            a if !(0.04..=0.96).contains(&a) => "near",
            _ => "",
        };
        let cls = [edge, if t.odd { "odd" } else { "" }].into_iter().filter(|c| !c.is_empty()).collect::<Vec<_>>().join(" ");
        w.open("span", &cls, &[("style", &format!("left:{}%", num(at * 100.0)))]);
        w.text(&t.text);
        w.close("span");
    }
    w.close("div");
}

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    let Ok(p) = serde_json::from_value::<Plot>(b.clone()) else {
        return fallback(w, b);
    };
    let d = p.drawn();
    let (x0, x1, y0, y1) = (d.x.0, d.x.1, d.y.0, d.y.1);
    let xf = |v: f64| (v - x0) / (x1 - x0);
    let yf = |v: f64| 1.0 - (v - y0) / (y1 - y0);
    w.open_block("div", "card plot as-surface", b, &[]);
    w.el("div", "plt", &p.title);
    legend(w, &p, &d);
    w.open("div", "plg", &[]);
    w.open("div", "plu", &[]);
    w.el("span", "", &axis_label(p.y.as_ref()));
    w.close("div");
    w.open("div", "ply", &[]);
    for t in &d.y_ticks {
        w.open("span", "", &[("style", &format!("top:{}%", num(yf(t.at) * 100.0)))]);
        w.text(&t.text);
        w.close("span");
    }
    w.close("div");
    marks(w, &p, &d, &xf, &yf);
    x_ticks(w, &d, &xf);
    let xl = axis_label(p.x.as_ref());
    if !xl.is_empty() {
        w.open("div", "plu x", &[]);
        w.el("span", "", &xl);
        w.close("div");
    }
    w.close("div");
    w.close("div");
}
