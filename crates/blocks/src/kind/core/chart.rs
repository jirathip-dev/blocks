use serde::{Deserialize, Serialize};
use serde_json::Number;

use crate::gesture::{Dir, Nudge, Rules, Word};
use crate::kind::{Block, Era, Gesture, Tap, Tone};

listed! { 30: Chart(Chart) = "chart" }

words!(ChartKind {
    Bar,
    Stacked,
    Line,
    Combo,
    Donut
});
words!(ChartFormat {
    Count,
    Thb,
    #[serde(rename = "thb_m")]
    ThbM,
    Percent
});
words!(SeriesMark { Bar, Line });

wire! {
    /// One named series of a chart: a value per x, its tone, a combo's mark, a dashed line, a move's step and `fixed`.
    pub struct Series {
        name: String,
        values: Vec<Number>,
        tone: Option<Tone>,
        #[serde(rename = "as")]
        mark: Option<SeriesMark>,
        dash: Option<bool>,
        step: Option<Number>,
        fixed: Option<bool>,
    }
}

kind! {
    /// A chart of named series over x values: bar, stacked, line, combo or donut; `move` drags a point's value.
    pub struct Chart {
        id: Option<String>,
        title: String,
        chart: ChartKind,
        x: Vec<String>,
        series: Vec<Series>,
        era: Option<Era>,
        format: Option<ChartFormat>,
        lang: Option<String>,
        selected: Option<String>,
        empty: Option<String>,
        tap: Option<Tap>,
        #[serde(rename = "move")]
        moves: Option<Gesture>,
    }
}

/// What a point's move gives: its series' name, its x as the chart wrote it, and its new value.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct PointMove {
    pub series: String,
    pub at: String,
    pub y: Number,
}

/// What a chart's move grabs: one point, by its series' name and its x.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct PointGrab {
    pub series: String,
    pub at: String,
}

/// A reach in whole steps of the grabbed series; up is more.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct PointReach {
    pub steps: i32,
}

fn nice(v: f64) -> f64 {
    if v <= 0.0 {
        return 1.0;
    }
    let p = 10f64.powf(v.log10().floor());
    let r = v / p;
    p * [1.0, 2.0, 2.5, 5.0].into_iter().find(|m| r <= *m).unwrap_or(10.0)
}

fn decimals(x: f64) -> i32 {
    (0..6)
        .find(|d| {
            let v = x * 10f64.powi(*d);
            (v - (v + 0.5).floor()).abs() < 1e-6
        })
        .unwrap_or(6)
}

fn fixed(v: f64, d: i32) -> String {
    let p = 10f64.powi(d);
    let n = (v * p + 0.5).floor();
    let whole = (n / p).floor();
    let digits = format!("{whole}");
    let mut out = String::new();
    for (i, c) in digits.chars().enumerate() {
        if i > 0 && (digits.len() - i).is_multiple_of(3) {
            out.push(',');
        }
        out.push(c);
    }
    if d > 0 {
        let width = usize::try_from(d).unwrap_or(0);
        out.push_str(&format!(".{:0>width$}", format!("{}", n - whole * p)));
    }
    out
}

fn whole(f: f64) -> Number {
    format!("{f}")
        .parse::<i64>()
        .map_or_else(|_| Number::from_f64(f).unwrap_or_else(|| 0.into()), Into::into)
}

impl Chart {
    /// Why the chart is unfit to send: over 5 series, a donut of other than one, or a `move` on a stacked or donut chart.
    #[must_use]
    pub fn unfit(&self) -> Option<String> {
        let n = self.series.len();
        if n > 5 {
            return Some(format!("a chart of {n} series: at most 5"));
        }
        if self.moves.is_some() && matches!(self.chart, ChartKind::Stacked | ChartKind::Donut) {
            return Some("a stacked or donut chart with move: a segment has no value of its own".into());
        }
        (self.chart == ChartKind::Donut && n > 1).then(|| format!("a donut of {n} series: one, over its slices"))
    }

    /// Whether a series is drawn as a line.
    #[must_use]
    pub fn is_line(&self, s: &Series) -> bool {
        self.chart == ChartKind::Line || (self.chart == ChartKind::Combo && s.mark == Some(SeriesMark::Line))
    }

    /// The value axis, bottom and top: a line's spans its values, the others start at zero.
    #[must_use]
    pub fn axis(&self) -> (f64, f64) {
        let at = |s: &Series, i: usize| s.values.get(i).and_then(Number::as_f64);
        if self.chart == ChartKind::Line {
            let all = self.series.iter().flat_map(|s| s.values.iter().filter_map(Number::as_f64));
            let (lo, hi) = all.fold((f64::MAX, f64::MIN), |(l, h), v| (l.min(v), h.max(v)));
            if lo > hi {
                return (0.0, 1.0);
            }
            let step = nice(if hi > lo {
                (hi - lo) / 2.0
            } else {
                hi.abs().max(1.0) / 2.0
            });
            let lo = (lo / step).floor() * step;
            let mut top = ((hi / step).ceil() * step).max(lo + step);
            if ((top - lo) / step).round() % 2.0 > 0.5 {
                top += step;
            }
            return (lo, top);
        }
        let stacked = self.chart != ChartKind::Bar;
        let max = (0..self.x.len())
            .map(|i| {
                let bars = self.series.iter().filter(|s| !self.is_line(s)).filter_map(|s| at(s, i));
                let lines = self.series.iter().filter(|s| self.is_line(s)).filter_map(|s| at(s, i));
                let bar = if stacked { bars.sum() } else { bars.fold(0.0, f64::max) };
                lines.fold(bar, f64::max)
            })
            .fold(0.0, f64::max);
        (0.0, nice(max * 1.04))
    }

    fn point(&self, grab: &PointGrab) -> Option<(&Series, f64)> {
        let i = self.x.iter().position(|x| *x == grab.at)?;
        let s = self.series.iter().find(|s| s.name == grab.series)?;
        Some((s, s.values.get(i)?.as_f64()?))
    }

    /// The step a series' point moves by: its `step`, else what the format shows.
    #[must_use]
    pub fn step(&self, s: &Series) -> f64 {
        s.step.as_ref().and_then(Number::as_f64).filter(|v| *v > 0.0).unwrap_or(match self.format {
            Some(ChartFormat::ThbM) => 100_000.0,
            Some(ChartFormat::Percent) => 0.1,
            _ => 1.0,
        })
    }

    /// A value at its series' step precision: ฿1.35M for a 50K step, where the chart shows ฿1.4M.
    #[must_use]
    pub fn shown(&self, s: &Series, v: f64) -> String {
        let (a, step) = (v.abs(), self.step(s));
        let body = match self.format {
            Some(ChartFormat::ThbM) if a >= 1e6 => format!("฿{}M", fixed(a / 1e6, decimals(step / 1e6).max(1))),
            Some(ChartFormat::ThbM) if a >= 1e3 => format!("฿{}K", fixed(a / 1e3, decimals(step / 1e3))),
            Some(ChartFormat::ThbM | ChartFormat::Thb) => format!("฿{}", fixed(a, decimals(step))),
            Some(ChartFormat::Percent) => format!("{}%", fixed(a, decimals(step))),
            _ => fixed(a, decimals(step)),
        };
        format!("{}{body}", if v < 0.0 { "-" } else { "" })
    }

    fn moved(&self, grab: &PointGrab, from: f64, by: i32) -> Option<PointMove> {
        let (s, _) = self.point(grab)?;
        let (step, (lo, hi)) = (self.step(s), self.axis());
        let k = ((from / step + 0.5).floor() + f64::from(by))
            .clamp((lo / step - 1e-9).ceil(), (hi / step + 1e-9).floor());
        let p = 10f64.powi(decimals(step));
        Some(PointMove {
            series: grab.series.clone(),
            at: grab.at.clone(),
            y: whole((k * step * p + 0.5).floor() / p),
        })
    }
}

impl Rules for Chart {
    type Grab = PointGrab;
    type Reach = PointReach;
    type Change = PointMove;

    fn word(&self, grab: &PointGrab) -> Option<Word> {
        let (s, _) = self.point(grab)?;
        let takes = matches!(self.chart, ChartKind::Line | ChartKind::Bar | ChartKind::Combo);
        (takes && self.moves.is_some() && s.fixed != Some(true)).then_some(Word::Move)
    }

    fn start(&self, grab: &PointGrab) -> Option<PointMove> {
        self.word(grab)?;
        let (s, _) = self.point(grab)?;
        let i = self.x.iter().position(|x| *x == grab.at)?;
        Some(PointMove {
            series: grab.series.clone(),
            at: grab.at.clone(),
            y: s.values.get(i)?.clone(),
        })
    }

    fn candidate(&self, grab: &PointGrab, reach: &PointReach) -> Option<PointMove> {
        let start = self.start(grab)?;
        if reach.steps == 0 {
            return Some(start);
        }
        self.moved(grab, start.y.as_f64()?, reach.steps)
    }

    fn nudge(&self, grab: &PointGrab, from: &PointMove, by: Nudge) -> Option<PointMove> {
        self.word(grab)?;
        let k = if by.big { 10 } else { 1 };
        let next = match by.dir {
            Dir::Up => self.moved(grab, from.y.as_f64()?, k),
            Dir::Down => self.moved(grab, from.y.as_f64()?, -k),
            Dir::Left | Dir::Right => None,
        }?;
        (next.y.as_f64() != from.y.as_f64()).then_some(next)
    }

    fn steps(&self, grab: &PointGrab) -> Vec<(String, Nudge)> {
        let Some(start) = self.start(grab) else { return vec![] };
        [("Raise", Dir::Up), ("Lower", Dir::Down)]
            .into_iter()
            .map(|(name, dir)| (name.to_string(), Nudge { dir, big: false }))
            .filter(|(_, n)| self.nudge(grab, &start, *n).is_some())
            .collect()
    }

    fn says(&self, grab: &PointGrab, change: &PointMove) -> String {
        match (self.point(grab), change.y.as_f64()) {
            (Some((s, _)), Some(y)) => format!("{}: {}", s.name, self.shown(s, y)),
            _ => change.y.to_string(),
        }
    }
}

fn chart() -> Chart {
    let months = ["2024-01", "2024-02", "2024-03", "2024-04", "2024-05", "2024-06"];
    let series = |name: &str, values: [u32; 6]| Series {
        name: name.into(),
        values: values.map(|v| (v * 100_000).into()).to_vec(),
        ..Series::default()
    };
    let target = Series {
        tone: Some(Tone::Warn),
        mark: Some(SeriesMark::Line),
        ..series("Target", [110, 110, 120, 120, 120, 125])
    };
    Chart::new(
        "Revenue and target",
        ChartKind::Combo,
        months.map(String::from).to_vec(),
        vec![series("Revenue", [111, 106, 129, 118, 122, 114]), target],
    )
    .id("revenue")
    .era(Era::Be)
    .format(ChartFormat::ThbM)
    .selected("2024-03")
    .tap(Tap {
        action: Some("sales.month".into()),
        ..Tap::default()
    })
}

fn plan() -> Chart {
    let months = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];
    let series = |name: &str, values: [u32; 6]| Series {
        name: name.into(),
        values: values.map(|v| (v * 10_000).into()).to_vec(),
        ..Series::default()
    };
    let actual = Series {
        fixed: Some(true),
        ..series("Actual", [112, 108, 126, 0, 0, 0])
    };
    let target = Series {
        tone: Some(Tone::Warn),
        mark: Some(SeriesMark::Line),
        step: Some(50_000.into()),
        ..series("Target", [110, 110, 120, 120, 120, 125])
    };
    Chart::new(
        "Revenue plan",
        ChartKind::Combo,
        months.map(String::from).to_vec(),
        vec![Series {
            values: actual.values.into_iter().take(3).collect(),
            ..actual
        }, target],
    )
    .id("targets")
    .format(ChartFormat::ThbM)
    .moves(Gesture {
        action: "plan.target".into(),
        name: "point".into(),
        enabled: None,
    })
}

pub(super) fn sample() -> Vec<Block> {
    vec![Block::Chart(Box::new(chart())), Block::Chart(Box::new(plan()))]
}
