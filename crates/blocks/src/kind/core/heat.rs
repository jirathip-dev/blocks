use serde::{Deserialize, Serialize};
use serde_json::Number;

use crate::kind::{Block, Tap};

listed! { 39: Heat(Heat) = "heat" }

words!(HeatTone {
    Info,
    Ok,
    Warn,
    Bad,
    Accent,
    Mute
});
words!(HeatEdges { Steps, Ends });

wire! {
    /// One cell: a value, a short label, both, or neither for no data.
    pub struct HeatCell {
        value: Option<Number>,
        label: Option<String>,
    }
}

wire! {
    /// A row of the grid: its name and one cell per column.
    pub struct HeatRow {
        name: String,
        cells: Vec<HeatCell>,
    }
}

wire! {
    /// The value scale: a fixed min and max (else from the values) and the unit the legend shows.
    pub struct HeatScale {
        min: Option<Number>,
        max: Option<Number>,
        unit: Option<String>,
    }
}

wire! {
    /// A cell by its row's name and its column.
    pub struct HeatPick {
        row: String,
        column: String,
    }
}

kind! {
    /// A grid of cells coloured by value on five steps of one tone, with row and column labels and a legend.
    pub struct Heat {
        id: Option<String>,
        title: String,
        columns: Vec<String>,
        grid: Vec<HeatRow>,
        scale: Option<HeatScale>,
        tone: Option<HeatTone>,
        edges: Option<HeatEdges>,
        lang: Option<String>,
        selected: Option<HeatPick>,
        empty: Option<String>,
        tap: Option<Tap>,
    }
}

fn nice(raw: f64) -> f64 {
    let p = 10f64.powf(raw.log10().floor());
    (raw / p).ceil() * p
}

impl Heat {
    fn values(&self) -> impl Iterator<Item = f64> + '_ {
        self.grid
            .iter()
            .flat_map(|r| r.cells.iter().filter_map(|c| c.value.as_ref()?.as_f64()))
    }

    /// The scale's ends: a given min (else 0, or the lowest value below it) and max (else a round number over the highest).
    #[must_use]
    pub fn range(&self) -> (f64, f64) {
        let given = |n: Option<&Number>| n.and_then(Number::as_f64);
        let sc = self.scale.as_ref();
        let (lo, hi) = self.values().fold((f64::MAX, f64::MIN), |(l, h), v| (l.min(v), h.max(v)));
        let min = given(sc.and_then(|s| s.min.as_ref())).unwrap_or(if lo < 0.0 { lo } else { 0.0 });
        let max = given(sc.and_then(|s| s.max.as_ref())).unwrap_or_else(|| {
            let raw = (hi - min) / 5.0;
            if lo > hi || raw <= 0.0 {
                min + 1.0
            } else {
                min + 5.0 * nice(raw)
            }
        });
        (min, max)
    }

    /// The colour step of a value, 1 (weakest) to 5 (strongest); values beyond the scale take the end step.
    #[must_use]
    pub fn step(&self, v: f64) -> u8 {
        let (min, max) = self.range();
        if max <= min {
            return 3;
        }
        let at = (v - min) / (max - min) * 5.0;
        (1u8..5).fold(1, |s, k| if at >= f64::from(k) { k + 1 } else { s })
    }

    /// Whether any cell has a value or a label: with none the block shows its empty text.
    #[must_use]
    pub fn drawn(&self) -> bool {
        self.grid
            .iter()
            .any(|r| r.cells.iter().any(|c| c.value.is_some() || c.label.is_some()))
    }
}

const DAYS: [&str; 7] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

fn cell(v: u32) -> HeatCell {
    HeatCell {
        value: Some(v.into()),
        label: None,
    }
}

fn load() -> Heat {
    let rows: Vec<HeatRow> = (1..=8u32)
        .map(|w| HeatRow {
            name: format!("Week {w}"),
            cells: (0..7u32)
                .map(|d| match (w, d) {
                    (_, 0) => HeatCell {
                        value: None,
                        label: Some("Rest".into()),
                    },
                    (7, 2) => HeatCell::default(),
                    _ => cell(30 + (w * 37 + d * 53) % 120),
                })
                .collect(),
        })
        .collect();
    Heat::new("Training load by day", DAYS.map(String::from).to_vec(), rows)
        .id("load")
        .tone(HeatTone::Warn)
        .scale(HeatScale {
            unit: Some("TSS".into()),
            ..HeatScale::default()
        })
        .selected(HeatPick {
            row: "Week 8".into(),
            column: "Sat".into(),
        })
        .tap(Tap {
            action: Some("training.day".into()),
            ..Tap::default()
        })
}

fn rides() -> Heat {
    let hours = ["6", "9", "12", "15", "18"];
    let rows: Vec<HeatRow> = DAYS
        .iter()
        .enumerate()
        .map(|(d, day)| HeatRow {
            name: (*day).into(),
            cells: (0..hours.len())
                .map(|h| match (d * 5 + h) % 4 {
                    0 => cell(u32::try_from(1 + (d + h) % 6).unwrap_or(1)),
                    _ => HeatCell::default(),
                })
                .collect(),
        })
        .collect();
    Heat::new("When you ride", hours.map(String::from).to_vec(), rows)
        .id("rides")
        .tone(HeatTone::Info)
        .edges(HeatEdges::Ends)
        .scale(HeatScale {
            unit: Some("rides".into()),
            ..HeatScale::default()
        })
}

fn sleep() -> Heat {
    let cells = [82, 74, 91, 66, 88, 95, 79]
        .map(|v| HeatCell {
            value: Some(v.into()),
            label: Some(v.to_string()),
        })
        .to_vec();
    Heat::new(
        "Sleep score",
        DAYS.map(String::from).to_vec(),
        vec![HeatRow {
            name: "This week".into(),
            cells,
        }],
    )
    .id("sleep")
    .tone(HeatTone::Ok)
    .scale(HeatScale {
        min: Some(50.into()),
        max: Some(100.into()),
        unit: None,
    })
}

pub(super) fn sample() -> Vec<Block> {
    vec![
        Block::Heat(Box::new(load())),
        Block::Heat(Box::new(rides())),
        Block::Heat(Box::new(sleep())),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn steps_split_the_scale_in_five_and_clamp_its_ends() {
        let h = sleep();
        assert_eq!(h.range(), (50.0, 100.0));
        assert_eq!([40.0, 50.0, 59.9, 60.0, 75.0, 99.0, 100.0, 130.0].map(|v| h.step(v)), [1, 1, 1, 2, 3, 5, 5, 5]);
    }

    #[test]
    fn an_open_scale_starts_at_zero_and_rounds_its_top_up() {
        assert_eq!(load().range(), (0.0, 150.0));
        assert_eq!(rides().range(), (0.0, 5.0));
    }
}
