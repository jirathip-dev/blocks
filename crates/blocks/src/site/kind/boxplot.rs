use serde_json::{Map, Number, Value};

use super::fallback;
use crate::site::write::{fields, sends, W};
use crate::{Boxplot, PlotBox, Tone};

fn f(n: usize) -> f64 {
    f64::from(u32::try_from(n).unwrap_or(u32::MAX))
}

fn num(x: f64) -> String {
    format!("{}", (x * 100.0).round() / 100.0 + 0.0)
}

fn colour(tone: Option<&Tone>) -> String {
    let k = match tone {
        Some(Tone::Ok) => "--g",
        Some(Tone::Warn) => "--a",
        Some(Tone::Bad) => "--r",
        Some(Tone::Info) => "--c",
        Some(Tone::Accent) => "--p",
        Some(Tone::Mute) => "--mute",
        _ => "--l",
    };
    format!("--k:var({k})")
}

fn mark(w: &mut W<'_>, cls: &str, style: &str) {
    w.open("i", cls, &[("style", style)]);
    w.close("i");
}

fn readout(w: &mut W<'_>, p: &Boxplot, at: Option<&PlotBox>) {
    w.open("div", "chl bxl", &[]);
    let Some(b) = at else {
        for (cls, t) in [("kr", "min to max"), ("kb", "Q1 to Q3"), ("km", "median"), ("ko", "outlier")] {
            w.open("span", "", &[]);
            mark(w, &format!("bxk {cls}"), "");
            w.text(t);
            w.close("span");
        }
        return w.close("div");
    };
    let unit = p.unit.as_ref().map(|u| format!(" {u}")).unwrap_or_default();
    let s = |v: &Number| p.shown(v);
    w.open("span", "chx", &[]);
    mark(w, "chk", &colour(b.tone.as_ref()));
    w.text(&b.name);
    w.close("span");
    let mut items = vec![
        ("median", format!("{}{unit}", s(&b.median))),
        ("Q1–Q3", format!("{} – {}", s(&b.q1), s(&b.q3))),
        ("min–max", format!("{} – {}", s(&b.min), s(&b.max))),
    ];
    let out: Vec<String> = b.outliers.iter().flatten().map(s).collect();
    items.extend((!out.is_empty()).then(|| ("outliers", out.join(", "))));
    for (k, v) in items {
        w.open("span", "", &[]);
        w.text(k);
        w.el("b", "", &v);
        w.close("span");
    }
    w.close("div");
}

fn tap(w: &mut W<'_>, b: &Value, x: &str, attrs: &[(&str, &str)]) {
    let t = b.get("tap");
    let mut all: Vec<(&str, &str)> = attrs.to_vec();
    let form;
    if let Some(a) = t.and_then(|t| sends(Some(t))) {
        let mut values: Map<String, Value> = fields(&[t.and_then(|t| t.get("values"))]);
        values.insert("x".into(), x.into());
        form = w.post(b.get("id"), a, &values);
        all.extend([("type", "submit"), ("form", form.as_str()), ("data-action", a)]);
    } else {
        all.push(("type", "button"));
    }
    w.open("button", "chc", &all);
    w.close("button");
}

fn plot(w: &mut W<'_>, p: &Boxplot, b: &Value, picked: Option<usize>, (lo, hi, step): (f64, f64, f64)) {
    let n = p.boxes.len();
    let top = |v: f64| num((hi - v) / (hi - lo) * 100.0);
    let at = |v: &Number| top(v.as_f64().unwrap_or(0.0));
    let up = |v: &Number| num((v.as_f64().unwrap_or(0.0) - lo) / (hi - lo) * 100.0);
    let tick = (0..2).find(|d| {
        let v = step * 10f64.powi(*d);
        (v - v.round()).abs() < 1e-6
    });
    let tick = usize::try_from(tick.unwrap_or(2)).unwrap_or(2);
    let ticks: Vec<f64> = (0..).map(|i| lo + f(i) * step).take_while(|v| *v <= hi + step / 2.0).collect();
    w.open("div", "chy", &[]);
    for v in &ticks {
        w.open("span", "", &[("style", &format!("top:{}%", top(*v)))]);
        w.text(&format!("{v:.tick$}"));
        w.close("span");
    }
    w.close("div");
    w.open("div", "chp", &[]);
    for (i, v) in ticks.iter().enumerate() {
        mark(w, if i == 0 { "bxg base" } else { "bxg" }, &format!("top:{}%", top(*v)));
    }
    let mid = |i: usize| num((f(i) + 0.5) / f(n) * 100.0);
    if let Some(i) = picked {
        mark(w, "chb bxb", &format!("left:{}%", mid(i)));
    }
    for (i, x) in p.boxes.iter().enumerate() {
        let st = format!("left:{}%;{}", mid(i), colour(x.tone.as_ref()));
        w.open("div", "bx", &[("style", &st), ("aria-hidden", "true")]);
        mark(w, "w", &format!("top:{}%;bottom:{}%", at(&x.max), up(&x.min)));
        mark(w, "q", &format!("top:{}%;bottom:{}%", at(&x.q3), up(&x.q1)));
        mark(w, "m", &format!("top:{}%", at(&x.median)));
        if x.max != x.q3 {
            mark(w, "cap", &format!("top:{}%", at(&x.max)));
        }
        if x.min != x.q1 {
            mark(w, "cap", &format!("top:{}%", at(&x.min)));
        }
        for o in x.outliers.iter().flatten() {
            mark(w, "o", &format!("top:{}%", at(o)));
        }
        w.close("div");
    }
    for (i, x) in p.boxes.iter().enumerate() {
        let style = format!("left:{}%;width:{}%", num(f(i) / f(n) * 100.0), num(100.0 / f(n)));
        let name = p.says(x);
        let mut attrs = vec![("style", style.as_str()), ("aria-label", name.as_str())];
        attrs.extend((picked == Some(i)).then_some(("aria-pressed", "true")));
        tap(w, b, &x.name, &attrs);
    }
    w.close("div");
}

fn labels(w: &mut W<'_>, p: &Boxplot, picked: Option<usize>) {
    let n = p.boxes.len();
    let (wide, phone) = (n.div_ceil(12).max(1), n.div_ceil(8).max(1));
    w.open("div", "chx2 bxx", &[]);
    for (i, x) in p.boxes.iter().enumerate() {
        let cls = [(i % wide == 0, "w"), (i % phone == 0, "p"), (picked == Some(i), "sel")]
            .iter()
            .filter(|(on, _)| *on)
            .map(|(_, c)| *c)
            .collect::<Vec<_>>()
            .join(" ");
        let left = format!("left:{}%", num((f(i) + 0.5) / f(n) * 100.0));
        w.open("span", &cls, &[("style", &left)]);
        w.text(&x.name);
        w.close("span");
    }
    w.close("div");
}

fn table(w: &mut W<'_>, p: &Boxplot) {
    w.open("details", "", &[]);
    w.el("summary", "", "Table");
    w.open("div", "tw", &[]);
    w.open("table", "", &[]);
    w.open("tr", "", &[]);
    for h in ["", "Min", "Q1", "Median", "Q3", "Max", "Outliers"] {
        w.el("th", "", h);
    }
    w.close("tr");
    for x in &p.boxes {
        let out: Vec<String> = x.outliers.iter().flatten().map(|v| p.shown(v)).collect();
        let out = if out.is_empty() { "—".into() } else { out.join(", ") };
        w.open("tr", "", &[]);
        w.el("td", "", &x.name);
        for v in [&x.min, &x.q1, &x.median, &x.q3, &x.max] {
            w.el("td", "", &p.shown(v));
        }
        w.el("td", "", &out);
        w.close("tr");
    }
    w.close("table");
    w.close("div");
    w.close("details");
}

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    let Ok(p) = serde_json::from_value::<Boxplot>(b.clone()) else {
        return fallback(w, b);
    };
    let n = p.boxes.len();
    let picked = p.selected.as_ref().and_then(|s| p.boxes.iter().position(|x| x.name == *s));
    w.open_block("div", "card chart bxp", b, &[]);
    w.el("div", "cht", &p.title);
    readout(w, &p, picked.and_then(|i| p.boxes.get(i)));
    let style = format!("--n:{};--sw:{};--sp:{}", n.max(1), n.div_ceil(12).max(1), n.div_ceil(8).max(1));
    w.open("div", "chg", &[("style", &style)]);
    let unit = p.unit.as_ref().map(|u| format!(" ({u})")).unwrap_or_default();
    w.el("div", "bxa", &format!("{}{unit}", p.axis));
    if let Some(axis) = p.axis() {
        plot(w, &p, b, picked, axis);
        labels(w, &p, picked);
    } else {
        w.el("div", "chy", "");
        w.open("div", "chp", &[]);
        w.el("div", "che", p.empty.as_deref().unwrap_or("No data yet"));
        w.close("div");
        w.el("div", "chx2 bxx", "");
    }
    w.close("div");
    table(w, &p);
    w.close("div");
}
