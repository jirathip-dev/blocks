use std::collections::{BTreeMap, BTreeSet};

use serde_json::Value;

use super::fallback;
use crate::site::write::W;
use crate::kind::{civil, day, TimeBar, TimeRow, Timeline};

const MONTHS: [&str; 12] = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];
const WD: [&str; 7] = ["T", "F", "S", "S", "M", "T", "W"];

fn weekday(n: i64) -> &'static str {
    usize::try_from(n.rem_euclid(7))
        .ok()
        .and_then(|i| WD.get(i))
        .copied()
        .unwrap_or_default()
}

fn lanes(bars: &[TimeBar]) -> (BTreeMap<&str, i64>, i64) {
    let mut sorted: Vec<&TimeBar> = bars.iter().collect();
    sorted.sort_by_key(|b| day(&b.start).unwrap_or_default());
    let mut ends: Vec<i64> = vec![];
    let mut of = BTreeMap::new();
    for b in sorted {
        let s = day(&b.start).unwrap_or_default();
        let i = ends.iter().position(|e| *e < s).unwrap_or(ends.len());
        if i == ends.len() {
            ends.push(0);
        }
        if let Some(e) = ends.get_mut(i) {
            *e = day(&b.end).unwrap_or(s);
        }
        of.insert(b.id.as_str(), i64::try_from(i).unwrap_or_default());
    }
    let n = i64::try_from(ends.len()).unwrap_or_default().max(1);
    (of, n)
}

fn axis(w: &mut W<'_>, f: i64, t: i64, off: &BTreeSet<i64>) {
    w.open("div", "tmhd", &[]);
    w.el("div", "tmc", "");
    w.open("div", "tmx", &[]);
    w.open("div", "tmm", &[]);
    let mut d = f;
    while d <= t {
        let (y, m, _) = civil(d);
        let k = (d..=t).take_while(|x| civil(*x).1 == m).count();
        w.open("span", "", &[("style", &format!("--k:{k}"))]);
        let month = usize::try_from(m - 1).ok().and_then(|i| MONTHS.get(i)).unwrap_or(&"");
        w.el("b", "", &format!("{month} {y}"));
        w.close("span");
        d += i64::try_from(k).unwrap_or(1).max(1);
    }
    w.close("div");
    w.open("div", "tmd", &[]);
    for d in f..=t {
        w.open("span", if off.contains(&d) { "off" } else { "" }, &[]);
        w.el("b", "", &civil(d).2.to_string());
        w.el("i", "", weekday(d));
        w.close("span");
    }
    w.close("div");
    w.close("div");
    w.close("div");
}

fn bar(w: &mut W<'_>, x: &TimeBar, y: i64, gap: i64, f: i64, t: i64) {
    let (Some(s), Some(e)) = (day(&x.start), day(&x.end)) else {
        return;
    };
    let (o, d) = (s.max(f) - f, e.min(t) - s.max(f) + 1);
    let tone = x.tone.as_ref().and_then(|v| serde_json::to_value(v).ok());
    let out = d <= 1 && gap >= 2 && x.label.is_some();
    let cls: Vec<&str> = [
        Some("tmb"),
        tone.as_ref().and_then(Value::as_str),
        (x.fixed == Some(true)).then_some("fix"),
        (s < f).then_some("cs"),
        (e > t).then_some("ce"),
        out.then_some("out"),
    ]
    .into_iter()
    .flatten()
    .collect();
    let style = format!("--o:{o};--d:{d};--y:{y};--gap:{gap}");
    w.open("div", &cls.join(" "), &[("style", &style)]);
    if let Some(p) = x.progress {
        w.open("i", "tmp", &[("style", &format!("--p:{}", f64::from(p) / 100.0))]);
        w.close("i");
    }
    w.el("span", "tmbx", x.label.as_deref().unwrap_or_default());
    let progress = x.progress.map(|p| format!(", {p} % done")).unwrap_or_default();
    let fixed = if x.fixed == Some(true) { ", fixed" } else { "" };
    let name = format!(
        "{}, {}{progress}{fixed}",
        x.label.as_deref().unwrap_or("Bar"),
        crate::kind::timeline_words(&x.start, &x.end)
    );
    w.open("div", "tmbb", &[("role", "listitem"), ("aria-label", &name)]);
    w.close("div");
    w.close("div");
}

fn track(w: &mut W<'_>, r: &TimeRow, f: i64, t: i64, off: &BTreeSet<i64>) {
    w.open("div", "tmr", &[]);
    w.open("div", "tml", &[]);
    w.el("b", "", &r.title);
    if let Some(s) = &r.subtitle {
        w.el("span", "", s);
    }
    w.close("div");
    let (of, n) = lanes(&r.bars);
    w.open(
        "div",
        "tmn",
        &[
            ("style", &format!("--rows:{n}")),
            ("role", "list"),
            ("aria-label", &r.title),
        ],
    );
    for d in off.iter().filter(|d| (f..=t).contains(*d)) {
        w.open("div", "tmo", &[("style", &format!("--o:{}", d - f))]);
        w.close("div");
    }
    for x in &r.bars {
        let (Some(s), Some(e)) = (day(&x.start), day(&x.end)) else {
            continue;
        };
        if e < f || s > t {
            continue;
        }
        let y = of.get(x.id.as_str()).copied().unwrap_or_default();
        let next = r
            .bars
            .iter()
            .filter(|q| of.get(q.id.as_str()) == Some(&y))
            .filter_map(|q| day(&q.start))
            .filter(|q| *q > e)
            .fold(t + 1, i64::min);
        bar(w, x, y, next - e.min(t) - 1, f, t);
    }
    w.close("div");
    w.close("div");
}

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    let Ok(tl) = serde_json::from_value::<Timeline>(b.clone()) else {
        return fallback(w, b);
    };
    w.open_block("div", "tm z1", b, &[]);
    w.open("div", "tmh", &[]);
    w.el("span", "tmt", tl.title.as_deref().unwrap_or_default());
    w.close("div");
    match (day(&tl.from), day(&tl.to)) {
        (Some(f), Some(t)) if t >= f && !tl.tracks.is_empty() => {
            w.open("div", "tmw", &[("style", &format!("--n:{}", t - f + 1))]);
            w.open("div", "tmg", &[]);
            let off: BTreeSet<i64> = tl.off.iter().flatten().filter_map(|d| day(d)).collect();
            axis(w, f, t, &off);
            for r in &tl.tracks {
                track(w, r, f, t, &off);
            }
            w.close("div");
            w.close("div");
        }
        _ => w.el("div", "tme", tl.empty.as_deref().unwrap_or("Nothing scheduled")),
    }
    w.close("div");
}
