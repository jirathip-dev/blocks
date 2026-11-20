use serde::{Deserialize, Serialize};
use serde_json::Number;

use crate::kind::{Block, Era, Tap, Tone};

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
    /// One named series of a chart: a value per x, its tone, a combo's mark and a dashed line.
    pub struct Series {
        name: String,
        values: Vec<Number>,
        tone: Option<Tone>,
        #[serde(rename = "as")]
        mark: Option<SeriesMark>,
        dash: Option<bool>,
    }
}

kind! {
    /// A chart of named series over x values: bar, stacked, line, combo or donut.
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
    }
}

impl Chart {
    /// Why the chart is unfit to send: over 5 series, or a donut of other than one.
    #[must_use]
    pub fn unfit(&self) -> Option<String> {
        let n = self.series.len();
        if n > 5 {
            return Some(format!("a chart of {n} series: at most 5"));
        }
        (self.chart == ChartKind::Donut && n > 1).then(|| format!("a donut of {n} series: one, over its slices"))
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

pub(super) fn sample() -> Vec<Block> {
    vec![Block::Chart(Box::new(chart()))]
}
