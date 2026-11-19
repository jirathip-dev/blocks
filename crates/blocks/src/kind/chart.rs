use serde::{Deserialize, Serialize};
use serde_json::Number;

use super::{Era, Fields, Tap, Tone};
use crate::expr::Expr;

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
