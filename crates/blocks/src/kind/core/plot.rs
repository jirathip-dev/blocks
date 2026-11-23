use serde::{Deserialize, Serialize};
use serde_json::Number;

use super::chart::{decimals, fixed, nice, whole};
use crate::kind::{Block, Fallback, Tone};

listed! { 39: Plot(Plot) = "plot" }

words!(AxisScale { Number, Time });

wire! {
    /// A plot's axis: its label and unit, a fixed range, and whether its values read as numbers or as seconds.
    pub struct PlotAxis {
        label: Option<String>,
        unit: Option<String>,
        min: Option<Number>,
        max: Option<Number>,
        scale: Option<AxisScale>,
    }
}

wire! {
    /// One named line of a plot: its tone and its points, an `x` and a `y` each.
    pub struct Trace {
        name: String,
        tone: Option<Tone>,
        x: Vec<Number>,
        y: Vec<Number>,
    }
}

/// A plot's target: the y range shaded from `min` to `max`.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct Target {
    pub min: Number,
    pub max: Number,
}

/// A plot's peak: a line across at `y`, with its label.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct Peak {
    pub y: Number,
    pub label: String,
}

kind! {
    /// A line plot of named series over a numeric or time x: points stream in by `points`; a window, a target and a peak.
    pub struct Plot {
        id: Option<String>,
        title: String,
        series: Vec<Trace>,
        x: Option<PlotAxis>,
        y: Option<PlotAxis>,
        window: Option<Number>,
        target: Option<Target>,
        peak: Option<Peak>,
        empty: Option<String>,
    }
}

/// A tick: where it sits on its axis, the text beside it, and whether its step is odd (hidden on a phone).
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct PlotTick {
    pub at: f64,
    pub text: String,
    pub odd: bool,
}

/// What every renderer draws of a plot: both ranges, their ticks, each series' points to join and latest value, the target's text.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlotDrawn {
    pub x: (f64, f64),
    pub y: (f64, f64),
    pub x_ticks: Vec<PlotTick>,
    pub y_ticks: Vec<PlotTick>,
    pub lines: Vec<Vec<usize>>,
    pub last: Vec<String>,
    pub band: Option<String>,
}

const TIME_STEPS: [f64; 14] = [
    1.0, 2.0, 5.0, 10.0, 15.0, 30.0, 60.0, 120.0, 300.0, 600.0, 900.0, 1800.0, 3600.0, 7200.0,
];

fn num(n: &Number) -> f64 {
    n.as_f64().unwrap_or(0.0)
}

fn at(v: &[Number], i: usize) -> f64 {
    v.get(i).map_or(0.0, num)
}

fn step(span: f64, most: f64, time: bool) -> f64 {
    if !time {
        return nice(span / most);
    }
    TIME_STEPS
        .into_iter()
        .find(|s| span / s <= most)
        .unwrap_or_else(|| 3600.0 * (span / most / 3600.0).ceil())
}

fn signed(v: f64, d: i32) -> String {
    let s = fixed(v.abs(), d);
    let zero = s.chars().all(|c| !c.is_ascii_digit() || c == '0');
    if v < 0.0 && !zero {
        format!("-{s}")
    } else {
        s
    }
}

fn clock(v: f64, hours: bool) -> String {
    let t = (v.abs() + 0.5).floor();
    let (h, m, s) = ((t / 3600.0).floor(), ((t % 3600.0) / 60.0).floor(), t % 60.0);
    let sign = if v < 0.0 && t > 0.0 { "-" } else { "" };
    if hours {
        format!("{sign}{h}:{m:02}:{s:02}")
    } else {
        format!("{sign}{}:{s:02}", h * 60.0 + m)
    }
}

fn ticks(range: (f64, f64), step: f64, time: bool) -> Vec<PlotTick> {
    let mut out = vec![];
    let mut k = (range.0 / step - 1e-9).ceil();
    while k * step <= range.1 + 1e-9 {
        let v = k * step;
        let text = if time {
            clock(v, range.1 >= 3600.0)
        } else {
            signed(v, decimals(step))
        };
        out.push(PlotTick {
            at: v,
            text,
            odd: (k % 2.0).abs() > 0.5,
        });
        k += 1.0;
    }
    out
}

fn shown(v: f64) -> String {
    signed(v, decimals(v).min(2))
}

fn unit(text: String, unit: &str) -> String {
    if unit.is_empty() {
        text
    } else {
        format!("{text} {unit}")
    }
}

impl Trace {
    /// A series' most points: `push` halves a series that reaches it, and `unfit` refuses one over it.
    pub const LIMIT: usize = 20_000;

    fn last_x(&self) -> Option<f64> {
        self.x.last().map(num)
    }

    fn halve(&mut self) {
        let (mut x, mut y) = (vec![], vec![]);
        let mut i = 0;
        while i < self.y.len() {
            let end = (i + 4).min(self.y.len());
            let (mut lo, mut hi) = (i, i);
            for j in i..end {
                if at(&self.y, j) < at(&self.y, lo) {
                    lo = j;
                }
                if at(&self.y, j) > at(&self.y, hi) {
                    hi = j;
                }
            }
            let mut keep = [lo.min(hi), lo.max(hi)].to_vec();
            keep.dedup();
            for j in keep {
                x.extend(self.x.get(j).cloned());
                y.extend(self.y.get(j).cloned());
            }
            i = end;
        }
        (self.x, self.y) = (x, y);
    }
}

impl Plot {
    /// Why the plot is unfit to send: over 5 series, two of one name, columns of two lengths, an x that goes back, a series over `Trace::LIMIT`, or a range upside down.
    #[must_use]
    pub fn unfit(&self) -> Option<String> {
        let n = self.series.len();
        if n > 5 {
            return Some(format!("a plot of {n} series: at most 5"));
        }
        for (i, s) in self.series.iter().enumerate() {
            let name = &s.name;
            if self.series.iter().skip(i + 1).any(|o| o.name == s.name) {
                return Some(format!("two series named {name}: `points` names a series by its name"));
            }
            if s.x.len() != s.y.len() {
                return Some(format!("{name} has {} x and {} y", s.x.len(), s.y.len()));
            }
            if let Some(j) = (1..s.x.len()).find(|&j| at(&s.x, j) < at(&s.x, j - 1)) {
                return Some(format!("{name}'s x goes back at point {j}: x only rises"));
            }
            if s.x.len() > Trace::LIMIT {
                let (len, max) = (s.x.len(), Trace::LIMIT);
                return Some(format!("{name} has {len} points: at most {max}; `push` keeps a series under it"));
            }
        }
        let upside = |what: &str, lo: Option<&Number>, hi: Option<&Number>| {
            lo.zip(hi)
                .filter(|(lo, hi)| num(lo) > num(hi))
                .map(|_| format!("{what}'s min is over its max"))
        };
        let axis = |what: &str, a: Option<&PlotAxis>| upside(what, a.and_then(|a| a.min.as_ref()), a.and_then(|a| a.max.as_ref()));
        let target = self.target.as_ref();
        upside("the target", target.map(|t| &t.min), target.map(|t| &t.max))
            .or_else(|| axis("the x axis", self.x.as_ref()))
            .or_else(|| axis("the y axis", self.y.as_ref()))
    }

    pub(crate) fn grow(&mut self, series: &str, drop: Option<usize>, x: &[Number], y: &[Number]) -> Result<(), String> {
        let s = self
            .series
            .iter_mut()
            .find(|s| s.name == series)
            .ok_or_else(|| format!("no series named {series}"))?;
        let drop = drop.unwrap_or(0);
        if drop > s.x.len() {
            return Err(format!("drop {drop} of {} points", s.x.len()));
        }
        if x.len() != y.len() {
            return Err(format!("{} x and {} y", x.len(), y.len()));
        }
        drop_front(&mut s.x, drop);
        drop_front(&mut s.y, drop);
        s.x.extend_from_slice(x);
        s.y.extend_from_slice(y);
        Ok(())
    }

    /// Adds a point to the series named `series`; false when no series has that name, a number is not finite or x goes back.
    pub fn push(&mut self, series: &str, x: f64, y: f64) -> bool {
        let Some(s) = self.series.iter_mut().find(|s| s.name == series) else {
            return false;
        };
        if !x.is_finite() || !y.is_finite() || s.last_x().is_some_and(|l| l > x) {
            return false;
        }
        s.x.push(whole(x));
        s.y.push(whole(y));
        match self.window.as_ref().map(num) {
            Some(w) => {
                let newest = self.series.iter().filter_map(Trace::last_x).fold(f64::MIN, f64::max);
                for s in &mut self.series {
                    let gone = s.x.partition_point(|v| num(v) < newest - w).saturating_sub(1);
                    drop_front(&mut s.x, gone);
                    drop_front(&mut s.y, gone);
                }
            }
            None if s.x.len() >= Trace::LIMIT => s.halve(),
            None => {}
        }
        true
    }

    fn x_range(&self) -> (f64, f64) {
        let window = self.window.as_ref().map(num);
        let held = self.series.iter().filter(|s| !s.x.is_empty());
        let first = held.clone().map(|s| at(&s.x, 0)).fold(f64::MAX, f64::min);
        let newest = held.filter_map(Trace::last_x).fold(f64::MIN, f64::max);
        let (lo, hi) = match window {
            _ if first > newest => (0.0, window.unwrap_or(1.0)),
            Some(w) if newest - w < first => (first, first + w),
            Some(w) => (newest - w, newest),
            None => (first, newest),
        };
        let axis = self.x.as_ref();
        let lo = axis.and_then(|a| a.min.as_ref()).map_or(lo, num);
        let hi = axis.and_then(|a| a.max.as_ref()).map_or(hi, num);
        (lo, if hi > lo { hi } else { lo + 1.0 })
    }

    fn line(s: &Trace, (lo, hi): (f64, f64)) -> Vec<usize> {
        let n = s.x.len().min(s.y.len());
        let a = s.x.partition_point(|v| num(v) < lo).min(n);
        let b = s.x.partition_point(|v| num(v) <= hi).min(n);
        let (from, to) = (a.saturating_sub(1), (b + 1).min(n));
        if to.saturating_sub(from) <= 2000 {
            return (from..to).collect();
        }
        let mut out: Vec<usize> = vec![];
        let mut col: Option<(f64, [usize; 4])> = None;
        let flush = |c: Option<(f64, [usize; 4])>, out: &mut Vec<usize>| {
            if let Some((_, mut k)) = c {
                k.sort_unstable();
                for i in k {
                    if out.last() != Some(&i) {
                        out.push(i);
                    }
                }
            }
        };
        for i in from..to {
            let c = ((at(&s.x, i) - lo) / (hi - lo) * 500.0).floor().clamp(0.0, 499.0);
            match &mut col {
                Some((at_col, k)) if (*at_col - c).abs() < 0.5 => {
                    if at(&s.y, i) < at(&s.y, k[1]) {
                        k[1] = i;
                    }
                    if at(&s.y, i) > at(&s.y, k[2]) {
                        k[2] = i;
                    }
                    k[3] = i;
                }
                _ => {
                    flush(col.take(), &mut out);
                    col = Some((c, [i; 4]));
                }
            }
        }
        flush(col, &mut out);
        out
    }

    fn y_range(&self, lines: &[Vec<usize>], time: bool) -> ((f64, f64), f64) {
        let points = self.series.iter().zip(lines).flat_map(|(s, l)| l.iter().map(|&i| at(&s.y, i)));
        let marks = self.target.iter().flat_map(|t| [num(&t.min), num(&t.max)]);
        let mut all = points.chain(marks).chain(self.peak.iter().map(|p| num(&p.y))).peekable();
        let (lo, hi) = if all.peek().is_none() {
            (0.0, 1.0)
        } else {
            let (lo, hi) = all.fold((f64::MAX, f64::MIN), |(l, h), v| (l.min(v), h.max(v)));
            let st = step(if hi > lo { hi - lo } else { 1.0 }, 4.0, time);
            let (lo, hi) = ((lo / st).floor() * st, (hi / st).ceil() * st);
            (lo, if hi > lo { hi } else { lo + st })
        };
        let axis = self.y.as_ref();
        let (min, max) = (axis.and_then(|a| a.min.as_ref()).map(num), axis.and_then(|a| a.max.as_ref()).map(num));
        let (lo, hi) = (min.unwrap_or(lo), max.unwrap_or(hi));
        let hi = if hi > lo { hi } else { lo + 1.0 };
        let st = step(hi - lo, 4.0, time);
        let lo = if min.is_some() { lo } else { (lo / st).floor() * st };
        let hi = if max.is_some() { hi } else { (hi / st).ceil() * st };
        ((lo, hi), st)
    }

    /// What a client with no plot view draws: the title, and each line's name with its latest value.
    #[must_use]
    pub fn fallback(&self) -> Fallback {
        let u = self.y.as_ref().and_then(|a| a.unit.as_deref()).unwrap_or_default();
        let lines: Vec<String> = self
            .series
            .iter()
            .filter_map(|s| Some(format!("{} {}", s.name, unit(shown(num(s.y.last()?)), u))))
            .collect();
        Fallback {
            title: self.title.clone(),
            subtitle: (!lines.is_empty()).then(|| lines.join(", ")),
            tap: None,
        }
    }

    /// What every renderer draws: both ranges, their ticks, each series' points to join and latest value, the target's text.
    #[must_use]
    pub fn drawn(&self) -> PlotDrawn {
        let time = |a: Option<&PlotAxis>| a.and_then(|a| a.scale.as_ref()) == Some(&AxisScale::Time);
        let (xt, yt) = (time(self.x.as_ref()), time(self.y.as_ref()));
        let x = self.x_range();
        let lines: Vec<Vec<usize>> = self.series.iter().map(|s| Self::line(s, x)).collect();
        let (y, y_step) = self.y_range(&lines, yt);
        let u = self.y.as_ref().and_then(|a| a.unit.as_deref()).unwrap_or_default();
        PlotDrawn {
            x_ticks: ticks(x, step(x.1 - x.0, 6.0, xt), xt),
            y_ticks: ticks(y, y_step, yt),
            lines,
            last: self
                .series
                .iter()
                .map(|s| s.y.last().map(|v| unit(shown(num(v)), u)).unwrap_or_default())
                .collect(),
            band: self
                .target
                .as_ref()
                .map(|t| unit(format!("{}–{}", shown(num(&t.min)), shown(num(&t.max))), u)),
            x,
            y,
        }
    }
}

fn drop_front(v: &mut Vec<Number>, n: usize) {
    if n > 0 {
        drop(v.drain(..n.min(v.len())));
    }
}

fn trace(name: &str, tone: Option<Tone>, points: impl Iterator<Item = (f64, f64)>) -> Trace {
    let (x, y) = points.map(|(x, y)| (whole(x), whole(y))).unzip();
    Trace {
        name: name.into(),
        tone,
        x,
        y,
    }
}

fn hang() -> Plot {
    let force = |t: f64| match t {
        t if t < 0.5 => 0.0,
        t if t < 8.5 => (300.0 + 120.0 * (-(t - 1.2) * (t - 1.2) * 3.0).exp() - 9.0 * (t - 1.0)).round() / 10.0,
        _ => 0.0,
    };
    let points = (0..=100).map(|i| f64::from(i) / 10.0).map(|t| (t, force(t)));
    let s = trace("Force", None, points);
    Plot::new("Max hang, 20 mm", vec![s])
        .id("hang")
        .x(PlotAxis {
            label: Some("Time".into()),
            scale: Some(AxisScale::Time),
            ..PlotAxis::default()
        })
        .y(PlotAxis {
            label: Some("Force".into()),
            unit: Some("kg".into()),
            ..PlotAxis::default()
        })
}

fn set() -> Plot {
    let pull = |top: f64| {
        move |t: f64| {
            let c = t % 10.0;
            let v = match c {
                c if c < 0.4 => top * c / 0.4,
                c if c < 7.0 => top + (t * 2.1).sin() * 0.8,
                c if c < 7.4 => top * (7.4 - c) / 0.4,
                _ => 0.0,
            };
            (v * 10.0).round() / 10.0
        }
    };
    let (now, last) = (pull(30.2), pull(26.1));
    let at = |to: u32, f: &dyn Fn(f64) -> f64| (0..=to).map(|i| f64::from(i) / 10.0).map(|t| (t, f(t))).collect::<Vec<_>>();
    let force = trace("Force", None, at(214, &now).into_iter());
    let before = trace("Set 2", None, at(300, &last).into_iter());
    let best = force.y.iter().map(num).fold(0.0, f64::max);
    Plot::new("Set 3", vec![force, before])
        .id("target")
        .x(PlotAxis {
            label: Some("Time".into()),
            scale: Some(AxisScale::Time),
            min: Some(0.into()),
            max: Some(30.into()),
            ..PlotAxis::default()
        })
        .y(PlotAxis {
            label: Some("Force".into()),
            unit: Some("kg".into()),
            min: Some(0.into()),
            max: Some(40.into()),
            ..PlotAxis::default()
        })
        .target(Target {
            min: 25.into(),
            max: 30.into(),
        })
        .peak(Peak {
            y: whole(best),
            label: format!("Peak {best} kg"),
        })
}

pub(super) fn sample() -> Vec<Block> {
    vec![Block::Plot(Box::new(hang())), Block::Plot(Box::new(set()))]
}
