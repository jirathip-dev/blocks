use serde::{Deserialize, Serialize};
use serde_json::Number;

use crate::kind::{Block, Fallback, Tap, Tone};

listed! { 39: Boxplot(Boxplot) = "boxplot" }

/// One category's box: its five numbers in order, the outliers beyond its whiskers and its tone.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct PlotBox {
    pub name: String,
    pub min: Number,
    pub q1: Number,
    pub median: Number,
    pub q3: Number,
    pub max: Number,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub outliers: Option<Vec<Number>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tone: Option<Tone>,
}

kind! {
    /// A box plot: one upright box per category on a value axis with its label and unit; a tap picks a box.
    pub struct Boxplot {
        id: Option<String>,
        title: String,
        axis: String,
        boxes: Vec<PlotBox>,
        unit: Option<String>,
        selected: Option<String>,
        empty: Option<String>,
        tap: Option<Tap>,
    }
}

impl PlotBox {
    /// A box from its five numbers, min to max.
    #[must_use]
    pub fn new(name: &str, [min, q1, median, q3, max]: [f64; 5]) -> Self {
        let n = |v: f64| Number::from_f64(v).unwrap_or_else(|| 0.into());
        Self {
            name: name.into(),
            min: n(min),
            q1: n(q1),
            median: n(median),
            q3: n(q3),
            max: n(max),
            outliers: None,
            tone: None,
        }
    }

    /// The box with these outliers.
    #[must_use]
    pub fn outliers(self, at: &[f64]) -> Self {
        Self {
            outliers: Some(at.iter().filter_map(|v| Number::from_f64(*v)).collect()),
            ..self
        }
    }

    /// Why the box is unfit: its five numbers out of order, or an outlier within its whiskers.
    #[must_use]
    pub fn unfit(&self) -> Option<String> {
        let five = [("min", &self.min), ("q1", &self.q1), ("median", &self.median), ("q3", &self.q3), ("max", &self.max)];
        let v = |n: &Number| n.as_f64().unwrap_or(0.0);
        let name = &self.name;
        let order = "a box needs min ≤ q1 ≤ median ≤ q3 ≤ max";
        for pair in five.windows(2) {
            if let [(a, x), (b, y)] = pair {
                if v(x) > v(y) {
                    return Some(format!("{name}: {a} {x} is over the {b} {y}; {order}"));
                }
            }
        }
        let (min, max) = (&self.min, &self.max);
        let inside = self.outliers.iter().flatten().find(|o| v(o) >= v(min) && v(o) <= v(max));
        inside.map(|o| format!("{name}: outlier {o} is inside min {min} to max {max}; an outlier lies beyond the whiskers"))
    }
}

fn close(v: f64) -> bool {
    (v - v.round()).abs() < 1e-6
}

impl PlotBox {
    fn values(&self) -> impl Iterator<Item = f64> + '_ {
        [&self.min, &self.q1, &self.median, &self.q3, &self.max]
            .into_iter()
            .chain(self.outliers.iter().flatten())
            .filter_map(Number::as_f64)
    }

    fn ends(&self) -> impl Iterator<Item = f64> + '_ {
        [&self.min, &self.max].into_iter().chain(self.outliers.iter().flatten()).filter_map(Number::as_f64)
    }
}

impl Boxplot {
    /// Why the box plot is unfit to send: a box out of order, an outlier within the whiskers, or two boxes of one name.
    #[must_use]
    pub fn unfit(&self) -> Option<String> {
        let mut seen = std::collections::BTreeSet::new();
        self.boxes.iter().find_map(|b| {
            b.unfit()
                .or_else(|| (!seen.insert(&b.name)).then(|| format!("a box plot with two boxes named {}", b.name)))
        })
    }

    /// The decimals a value is shown with: as many as the data has, at most 2.
    #[must_use]
    pub fn places(&self) -> usize {
        let all = self.boxes.iter().flat_map(PlotBox::values);
        all.map(|v| (0..2).find(|d| close(v * 10f64.powi(*d))).map_or(2, |d| usize::try_from(d).unwrap_or(2)))
            .max()
            .unwrap_or(0)
    }

    /// A value as the plot shows it, with the plot's decimals.
    #[must_use]
    pub fn shown(&self, v: &Number) -> String {
        format!("{:.*}", self.places(), v.as_f64().unwrap_or(0.0))
    }

    /// The value axis, bottom, top and tick step: round steps past the outermost value; `None` with no boxes.
    #[must_use]
    pub fn axis(&self) -> Option<(f64, f64, f64)> {
        let all: Vec<f64> = self.boxes.iter().flat_map(PlotBox::ends).collect();
        let lo = all.iter().copied().reduce(f64::min)?;
        let hi = all.iter().copied().reduce(f64::max)?;
        let raw = if hi > lo { (hi - lo) / 4.0 } else { 0.25 };
        let p = 10f64.powf(raw.log10().floor());
        let step = p * [1.0, 2.0, 2.5, 5.0].into_iter().find(|m| raw / p <= *m).unwrap_or(10.0);
        let (mut bottom, mut top) = ((lo / step).floor() * step, (hi / step).ceil() * step);
        if close((top - hi) / step) {
            top += step;
        }
        if close((bottom - lo) / step) && lo > 0.0 {
            bottom -= step;
        }
        Some((bottom, top, step))
    }

    /// What a box's column says to a screen reader: its median, quartiles, range and outliers.
    #[must_use]
    pub fn says(&self, b: &PlotBox) -> String {
        let unit = self.unit.as_ref().map(|u| format!(" {u}")).unwrap_or_default();
        let s = |v| self.shown(v);
        let out = b.outliers.as_deref().unwrap_or_default();
        let shown: Vec<String> = out.iter().map(s).collect();
        let more = match out.len() {
            0 => String::new(),
            1 => format!(", 1 outlier: {}", shown.join(", ")),
            n => format!(", {n} outliers: {}", shown.join(", ")),
        };
        format!(
            "{}: median {}{unit}, quartiles {} to {}, range {} to {}{more}",
            b.name,
            s(&b.median),
            s(&b.q1),
            s(&b.q3),
            s(&b.min),
            s(&b.max)
        )
    }

    /// What a client with no box plot draws: the title and each box's median.
    #[must_use]
    pub fn fallback(&self) -> Fallback {
        let unit = self.unit.as_ref().map(|u| format!(" {u}")).unwrap_or_default();
        let medians: Vec<String> = self.boxes.iter().map(|b| format!("{} median {}{unit}", b.name, self.shown(&b.median))).collect();
        Fallback {
            title: self.title.clone(),
            subtitle: (!medians.is_empty()).then(|| medians.join(", ")),
            tap: self.tap.clone(),
        }
    }
}

fn hands() -> Boxplot {
    Boxplot::new(
        "Peak force per hand",
        "Peak force",
        vec![
            PlotBox::new("Left", [25.8, 30.4, 33.1, 36.0, 41.2]).outliers(&[18.0, 47.5]),
            PlotBox::new("Right", [28.2, 32.9, 35.6, 38.1, 43.0]).outliers(&[21.4]),
        ],
    )
    .id("hands")
    .unit("kg")
    .selected("Left")
    .tap(Tap {
        action: Some("force.hand".into()),
        ..Tap::default()
    })
}

fn fingers() -> Boxplot {
    let little = PlotBox {
        tone: Some(Tone::Warn),
        ..PlotBox::new("Little", [8.0, 10.2, 11.5, 12.9, 15.1]).outliers(&[4.2])
    };
    Boxplot::new(
        "Force share per finger",
        "Share of force",
        vec![
            PlotBox::new("Index", [24.0, 27.5, 29.1, 31.0, 34.2]),
            PlotBox::new("Middle", [28.1, 31.2, 33.0, 34.8, 37.5]).outliers(&[41.0]),
            PlotBox::new("Ring", [20.3, 23.0, 24.6, 26.1, 28.9]),
            little,
        ],
    )
    .id("fingers")
    .unit("%")
}

fn sessions() -> Boxplot {
    let days = ["14 Oct", "16 Oct", "21 Oct", "23 Oct", "28 Oct", "30 Oct", "4 Nov", "11 Nov", "13 Nov", "18 Nov"];
    let boxes: Vec<PlotBox> = days
        .iter()
        .zip(0u32..)
        .map(|(day, i)| {
            let m = 30.0 + f64::from(i) * 0.6 + f64::from(i % 3);
            let r = |d: f64| ((m + d) * 10.0).round() / 10.0;
            let b = PlotBox::new(day, [r(-5.0), r(-2.1), r(0.0), r(2.3), r(5.2)]);
            let b = if i % 4 == 1 { b.outliers(&[r(8.4)]) } else { b };
            if i == 1 {
                PlotBox {
                    tone: Some(Tone::Bad),
                    ..b
                }
            } else {
                b
            }
        })
        .collect();
    Boxplot::new("Peak force per session", "Peak force", boxes)
        .id("sessions")
        .unit("kg")
        .selected("18 Nov")
        .empty("No sessions yet: hang the board to see your force.")
        .tap(Tap {
            action: Some("force.session".into()),
            ..Tap::default()
        })
}

pub(super) fn sample() -> Vec<Block> {
    [hands(), fingers(), sessions()]
        .into_iter()
        .map(|b| Block::Boxplot(Box::new(b)))
        .collect()
}
