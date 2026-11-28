use serde_json::{Map, Value};

use super::fallback;
use crate::site::write::{fields, sends, W};
use crate::{Chart, ChartFormat, ChartKind, Era, Series, Tone};

const H: f64 = 180.0;
const ORDER: [&str; 5] = ["--l", "--c", "--a", "--p", "--g"];
const EN: [&str; 12] = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const TH: [&str; 12] = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
];

fn f(n: usize) -> f64 {
    f64::from(u32::try_from(n).unwrap_or(u32::MAX))
}

fn num(x: f64) -> String {
    format!("{}", (x * 100.0).round() / 100.0 + 0.0)
}

fn group(v: f64, tenths: bool) -> String {
    let scaled = (v * if tenths { 10.0 } else { 1.0 }).round();
    let whole = if tenths { (scaled / 10.0).trunc() } else { scaled };
    let digits = format!("{whole:.0}");
    let mut out = String::new();
    for (i, c) in digits.chars().enumerate() {
        if i > 0 && (digits.len() - i) % 3 == 0 {
            out.push(',');
        }
        out.push(c);
    }
    let tenth = scaled - whole * 10.0;
    if tenths && tenth > 0.0 {
        out.push_str(&format!(".{tenth:.0}"));
    }
    out
}

fn value(v: Option<f64>, format: Option<&ChartFormat>) -> String {
    let Some(v) = v else { return "—".into() };
    let (sign, a) = (if v < 0.0 { "-" } else { "" }, v.abs());
    let body = match format {
        Some(ChartFormat::ThbM) if a >= 1e6 => format!("฿{}M", group(a / 1e6, true)),
        Some(ChartFormat::ThbM) if a >= 1e3 => format!("฿{}K", group(a / 1e3, false)),
        Some(ChartFormat::Thb | ChartFormat::ThbM) => format!("฿{}", group(a, false)),
        Some(ChartFormat::Percent) => format!("{}%", group(a, true)),
        _ => group(a, false),
    };
    format!("{sign}{body}")
}

fn label(c: &Chart, x: &str, long: bool) -> String {
    let b = x.as_bytes();
    let shaped = b.len() == 7
        && b.iter()
            .enumerate()
            .all(|(i, c)| if i == 4 { *c == b'-' } else { c.is_ascii_digit() });
    let year = x.get(..4).and_then(|y| y.parse::<u32>().ok());
    let month = x.get(5..).and_then(|m| m.parse::<usize>().ok());
    let names = if c.lang.as_deref() == Some("th") { TH } else { EN };
    let name = month.and_then(|m| names.get(m.checked_sub(1)?));
    match (year, name) {
        (Some(y), Some(n)) if shaped => {
            let y = y + if c.era == Some(Era::Be) { 543 } else { 0 };
            if long {
                format!("{n} {y}")
            } else {
                format!("{n} {:02}", y % 100)
            }
        }
        _ => x.into(),
    }
}

pub(super) fn colour(tone: Option<&Tone>, i: usize) -> String {
    let token = match tone {
        Some(Tone::Ok) => "--g",
        Some(Tone::Warn) => "--a",
        Some(Tone::Bad) => "--r",
        Some(Tone::Info) => "--c",
        Some(Tone::Accent) => "--p",
        Some(Tone::Mute) => "--mute",
        _ => ORDER.get(i % ORDER.len()).copied().unwrap_or("--l"),
    };
    format!("--k:var({token})")
}

fn at(s: &Series, i: usize) -> Option<f64> {
    s.values.get(i).and_then(serde_json::Number::as_f64)
}

fn svg(c: &Chart, (lo, hi): (f64, f64)) -> String {
    let n = c.x.len();
    let w = num(f(n) * 10.0);
    let y = |v: f64| H - (v - lo) / (hi - lo) * H;
    let mut out = format!(
        "<svg viewBox=\"0 0 {w} {}\" preserveAspectRatio=\"none\" aria-hidden=\"true\">",
        num(H)
    );
    for t in [0.5, 1.0] {
        out.push_str(&format!(
            "<line class=\"grid\" x1=\"0\" x2=\"{w}\" y1=\"{0}\" y2=\"{0}\"/>",
            num(H - t * H)
        ));
    }
    let gap = if n > 16 { 1.5 } else { 2.5 };
    let bars: Vec<(usize, &Series)> = c.series.iter().enumerate().filter(|(_, s)| !c.is_line(s)).collect();
    let rect = |x: f64, width: f64, top: f64, bottom: f64, k: &str| {
        format!(
            "<rect class=\"s\" x=\"{}\" width=\"{}\" y=\"{}\" height=\"{}\" style=\"{k}\"/>",
            num(x),
            num(width),
            num(top),
            num((bottom - top).max(0.0))
        )
    };
    for i in 0..n {
        let left = f(i) * 10.0 + gap;
        if c.chart == ChartKind::Bar {
            let each = (10.0 - 2.0 * gap) / f(bars.len().max(1));
            let thin = if bars.len() > 1 { 0.4 } else { 0.0 };
            for (j, (si, s)) in bars.iter().enumerate() {
                if let Some(v) = at(s, i) {
                    let k = colour(s.tone.as_ref(), *si);
                    out.push_str(&rect(left + f(j) * each, (each - thin).max(0.2), y(v.max(lo)), H, &k));
                }
            }
        } else {
            let mut base = 0.0;
            for (si, s) in &bars {
                let Some(v) = at(s, i).filter(|v| *v > 0.0) else {
                    continue;
                };
                let k = colour(s.tone.as_ref(), *si);
                let cut = if base > 0.0 { 2.0 } else { 0.0 };
                out.push_str(&rect(left, 10.0 - 2.0 * gap, y(base + v), y(base) - cut, &k));
                base += v;
            }
        }
    }
    out.push_str(&format!(
        "<line class=\"base\" x1=\"0\" x2=\"{w}\" y1=\"{0}\" y2=\"{0}\"/>",
        num(H)
    ));
    for (si, s) in c.series.iter().enumerate().filter(|(_, s)| c.is_line(s)) {
        let pts: Vec<String> = (0..n)
            .filter_map(|i| Some(format!("{} {}", num(f(i) * 10.0 + 5.0), num(y(at(s, i)?)))))
            .collect();
        let dash = if s.dash == Some(true) { " dash" } else { "" };
        let k = colour(s.tone.as_ref(), si);
        out.push_str(&format!(
            "<path class=\"s{dash}\" d=\"M{}\" style=\"{k}\"/>",
            pts.join("L")
        ));
    }
    out + "</svg>"
}

fn pct(share: f64) -> String {
    format!("{:.0}%", share.round())
}

fn tap(w: &mut W<'_>, b: &Value, x: &str, cls: &str, attrs: &[(&str, &str)]) {
    let t = b.get("tap");
    let mut all: Vec<(&str, &str)> = attrs.to_vec();
    let form;
    let action = t.and_then(|t| sends(Some(t)));
    if let Some(a) = action {
        let mut values: Map<String, Value> = fields(&[t.and_then(|t| t.get("values"))]);
        values.insert("x".into(), x.into());
        form = w.post(b.get("id"), a, &values);
        all.extend([("type", "submit"), ("form", form.as_str()), ("data-action", a)]);
    } else {
        all.push(("type", "button"));
    }
    w.open("button", cls, &all);
}

fn legend(w: &mut W<'_>, c: &Chart, at_x: Option<usize>) {
    w.open("div", "chl", &[]);
    if let Some(x) = at_x.and_then(|i| c.x.get(i)) {
        w.el("span", "chx", &label(c, x, true));
    }
    for (i, s) in c.series.iter().enumerate() {
        let cls = format!(
            "chk{}{}",
            if c.is_line(s) { " chkl" } else { "" },
            if s.dash == Some(true) { " chkd" } else { "" }
        );
        w.open("span", "", &[]);
        w.open("i", &cls, &[("style", &colour(s.tone.as_ref(), i))]);
        w.close("i");
        w.text(&s.name);
        if let Some(i) = at_x {
            w.el("b", "", &value(at(s, i), c.format.as_ref()));
        }
        w.close("span");
    }
    w.close("div");
}

fn table(w: &mut W<'_>, c: &Chart, head: &[String], rows: &[Vec<String>]) {
    w.open("details", "", &[]);
    w.el(
        "summary",
        "",
        if c.lang.as_deref() == Some("th") {
            "ตาราง"
        } else {
            "Table"
        },
    );
    w.open("div", "tw", &[]);
    w.open("table", "", &[]);
    for (i, r) in std::iter::once(head).chain(rows.iter().map(Vec::as_slice)).enumerate() {
        w.open("tr", "", &[]);
        for cell in r {
            w.el(if i == 0 { "th" } else { "td" }, "", cell);
        }
        w.close("tr");
    }
    w.close("table");
    w.close("div");
    w.close("details");
}

fn plot(w: &mut W<'_>, c: &Chart, b: &Value) {
    let n = c.x.len();
    let empty = c.series.iter().all(|s| s.values.is_empty()) || n == 0;
    let picked = c
        .selected
        .as_ref()
        .and_then(|s| c.x.iter().position(|x| x == s))
        .filter(|_| !empty);
    legend(w, c, (!empty).then(|| picked.unwrap_or(n.saturating_sub(1))));
    let (lo, hi) = c.axis();
    w.open("div", "chg", &[]);
    ticks(w, c, empty, (lo, hi));
    w.open("div", "chp", &[]);
    let band = |i: usize| format!("left:{}%;width:{}%", num(f(i) / f(n) * 100.0), num(100.0 / f(n)));
    if let Some(i) = picked {
        w.open("i", "chb", &[("style", &band(i))]);
        w.close("i");
    }
    w.raw(&svg(c, (lo, hi)));
    for (si, s) in c.series.iter().enumerate().filter(|(_, s)| c.is_line(s)) {
        let Some((i, v)) = picked.and_then(|i| Some((i, at(s, i)?))) else {
            continue;
        };
        let y = (H - (v - lo) / (hi - lo) * H) / H * 100.0;
        let k = colour(s.tone.as_ref(), si);
        let st = format!("left:{}%;top:{}%;{k}", num((f(i) + 0.5) / f(n) * 100.0), num(y));
        w.open("i", "chd", &[("style", &st)]);
        w.close("i");
    }
    if empty {
        w.el("div", "che", c.empty.as_deref().unwrap_or("No data yet"));
    }
    for (i, x) in c.x.iter().enumerate().filter(|_| !empty) {
        let vals: Vec<String> = c
            .series
            .iter()
            .map(|s| format!("{} {}", s.name, value(at(s, i), c.format.as_ref())))
            .collect();
        let name = format!("{}: {}", label(c, x, true), vals.join(", "));
        let mut attrs = vec![("style", band(i)), ("aria-label", name)];
        attrs.extend((picked == Some(i)).then(|| ("aria-pressed", "true".into())));
        let attrs: Vec<(&str, &str)> = attrs.iter().map(|(k, v)| (*k, v.as_str())).collect();
        tap(w, b, x, "chc", &attrs);
        w.close("button");
    }
    w.close("div");
    xlabels(w, c, picked);
    w.close("div");
    let head: Vec<String> = std::iter::once(String::new())
        .chain(c.series.iter().map(|s| s.name.clone()))
        .collect();
    let rows: Vec<Vec<String>> = (0..n)
        .map(|i| {
            let x = c.x.get(i).map(|x| label(c, x, true)).unwrap_or_default();
            std::iter::once(x)
                .chain(c.series.iter().map(|s| value(at(s, i), c.format.as_ref())))
                .collect()
        })
        .collect();
    table(w, c, &head, &rows);
}

fn ticks(w: &mut W<'_>, c: &Chart, empty: bool, (lo, hi): (f64, f64)) {
    w.open("div", "chy", &[]);
    for t in [0.0, 0.5, 1.0] {
        let top = format!("top:{}%", num(100.0 - t * 100.0));
        let text = if empty {
            String::new()
        } else {
            value(Some(lo + (hi - lo) * t), c.format.as_ref())
        };
        w.open("span", "", &[("style", &top)]);
        w.text(&text);
        w.close("span");
    }
    w.close("div");
}

fn xlabels(w: &mut W<'_>, c: &Chart, picked: Option<usize>) {
    let n = c.x.len();
    w.open("div", "chx2", &[]);
    let (wide, phone) = (n.div_ceil(12).max(1), n.div_ceil(6).max(1));
    for (i, x) in c.x.iter().enumerate() {
        let cls = [(i % wide == 0, "w"), (i % phone == 0, "p"), (picked == Some(i), "sel")]
            .iter()
            .filter(|(on, _)| *on)
            .map(|(_, c)| *c)
            .collect::<Vec<_>>()
            .join(" ");
        let left = format!("left:{}%", num((f(i) + 0.5) / f(n) * 100.0));
        w.open("span", &cls, &[("style", &left)]);
        w.text(&label(c, x, false));
        w.close("span");
    }
    w.close("div");
}

fn slices(c: &Chart) -> Vec<(String, f64, Option<Tone>)> {
    let s = c.series.first();
    let mut parts: Vec<(String, f64, Option<Tone>)> =
        c.x.iter()
            .enumerate()
            .map(|(i, x)| (x.clone(), s.and_then(|s| at(s, i)).unwrap_or(0.0), None))
            .collect();
    parts.sort_by(|a, b| b.1.total_cmp(&a.1));
    if parts.len() > 5 {
        let rest = parts.split_off(4);
        let other = if c.lang.as_deref() == Some("th") {
            "อื่นๆ"
        } else {
            "Other"
        };
        parts.push((
            format!("{other} ({})", rest.len()),
            rest.iter().map(|p| p.1).sum(),
            Some(Tone::Mute),
        ));
    }
    parts
}

fn donut(w: &mut W<'_>, c: &Chart, b: &Value) {
    let parts = slices(c);
    let total: f64 = parts.iter().map(|p| p.1).sum();
    let share = |v: f64| if total > 0.0 { v / total * 100.0 } else { 0.0 };
    let sel = parts.iter().find(|p| c.selected.as_ref() == Some(&p.0));
    let fmt = c.format.as_ref();
    w.open("div", "chn", &[]);
    w.open("div", "ring", &[]);
    let mut ring = String::from("<svg viewBox=\"0 0 100 100\" aria-hidden=\"true\">");
    let mut off = 0.0;
    for (i, (name, v, tone)) in parts.iter().enumerate() {
        let len = share(*v);
        let cls = if sel.is_some_and(|s| &s.0 == name) {
            " class=\"sel\""
        } else {
            ""
        };
        ring.push_str(&format!(
            "<circle cx=\"50\" cy=\"50\" r=\"40\" pathLength=\"100\" stroke-dasharray=\"{} {}\" stroke-dashoffset=\"{}\"{cls} style=\"{}\"/>",
            num((len - 0.8).max(0.0)),
            num(100.0 - len + 0.8),
            num(-off),
            colour(tone.as_ref(), i)
        ));
        off += len;
    }
    w.raw(&(ring + "</svg>"));
    w.open("div", "mid", &[]);
    w.el("b", "", &value(Some(sel.map_or(total, |s| s.1)), fmt));
    let all = if c.lang.as_deref() == Some("th") {
        "รวม"
    } else {
        "Total"
    };
    w.el("span", "", sel.map_or(all, |s| s.0.as_str()));
    w.close("div");
    w.close("div");
    w.open("div", "rows", &[]);
    for (i, (name, v, tone)) in parts.iter().enumerate() {
        let p = pct(share(*v));
        let aria = format!("{name}: {}, {p}", value(Some(*v), fmt));
        let on = sel.is_some_and(|s| &s.0 == name);
        tap(w, b, name, if on { "chr sel" } else { "chr" }, &[("aria-label", &aria)]);
        w.open("i", "chk", &[("style", &colour(tone.as_ref(), i))]);
        w.close("i");
        w.el("span", "nm", name);
        w.el("b", "", &value(Some(*v), fmt));
        w.el("i", "pc", &p);
        w.close("button");
    }
    w.close("div");
    w.close("div");
    let head = ["", c.series.first().map_or("", |s| s.name.as_str()), "%"].map(String::from);
    let rows: Vec<Vec<String>> = parts
        .iter()
        .map(|(name, v, _)| vec![name.clone(), value(Some(*v), fmt), pct(share(*v))])
        .collect();
    table(w, c, &head, &rows);
}

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    let Ok(c) = serde_json::from_value::<Chart>(b.clone()) else {
        return fallback(w, b);
    };
    w.open_block("div", "card chart as-surface", b, &[]);
    w.el("div", "cht", &c.title);
    if c.chart == ChartKind::Donut {
        donut(w, &c, b);
    } else {
        plot(w, &c, b);
    }
    w.close("div");
}
