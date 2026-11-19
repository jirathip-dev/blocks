use serde::{Deserialize, Serialize};

use super::{Block, Fields, Gesture, Tap, Tone};
use crate::expr::Expr;
use crate::gesture::{Dir, Nudge, Rules, Word};

kind! {
    /// Rows of bars on a day axis from `from` to `to` (ISO days); `move`, `stretch` and `draw` each send a `DaySpan`.
    pub struct Timeline {
        id: Option<String>,
        title: Option<String>,
        from: String,
        to: String,
        off: Option<Vec<String>>,
        tracks: Vec<TimeRow>,
        empty: Option<String>,
        #[serde(rename = "move")]
        moves: Option<Gesture>,
        stretch: Option<Gesture>,
        draw: Option<Gesture>,
    }
}

wire! {
    /// One row of a timeline: its title and the bars on it.
    pub struct TimeRow {
        id: String,
        title: String,
        subtitle: Option<String>,
        bars: Vec<TimeBar>,
        tap: Option<Tap>,
    }
}

wire! {
    /// A bar from `start` to `end`, both ISO days and both drawn; `fixed` takes no gesture.
    pub struct TimeBar {
        id: String,
        start: String,
        end: String,
        label: Option<String>,
        tone: Option<Tone>,
        progress: Option<u8>,
        fixed: Option<bool>,
        tap: Option<Tap>,
    }
}

wire! {
    /// What a move, a stretch or a draw gives: the bar's `id` for the first two, the `row` for a draw.
    pub struct DaySpan {
        id: Option<String>,
        row: Option<String>,
        start: String,
        end: String,
    }
}

/// The part of a bar a grab holds: its body moves it, an end stretches it.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BarPart {
    Body,
    Start,
    End,
}

/// What a timeline's gesture grabs: a bar's part, or a row to draw on.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum BarGrab {
    Bar { bar: String, part: BarPart },
    Row { row: String },
}

/// A reach in whole days; a draw's starts at `from`, else at the row's first free day.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Days {
    pub days: i64,
    #[serde(default)]
    pub from: Option<String>,
}

const MONTHS: [&str; 12] = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

pub(crate) fn civil(n: i64) -> (i64, i64, i64) {
    let z = n + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    (yoe + era * 400 + i64::from(m <= 2), m, d)
}

pub(crate) fn day(s: &str) -> Option<i64> {
    let mut it = s.splitn(3, '-').map(str::parse::<i64>);
    let (y, m, d) = (it.next()?.ok()?, it.next()?.ok()?, it.next()?.ok()?);
    let yy = if m <= 2 { y - 1 } else { y };
    let era = yy.div_euclid(400);
    let yoe = yy - era * 400;
    let doy = (153 * ((m + 9) % 12) + 2) / 5 + d - 1;
    let n = era * 146_097 + yoe * 365 + yoe / 4 - yoe / 100 + doy - 719_468;
    (iso(n) == s).then_some(n)
}

fn iso(n: i64) -> String {
    let (y, m, d) = civil(n);
    format!("{y:04}-{m:02}-{d:02}")
}

fn short(n: i64) -> String {
    let (_, m, d) = civil(n);
    let month = usize::try_from(m - 1).ok().and_then(|i| MONTHS.get(i)).unwrap_or(&"");
    format!("{d} {month}")
}

pub(crate) fn words(start: &str, end: &str) -> String {
    let (Some(a), Some(b)) = (day(start), day(end)) else {
        return format!("{start} to {end}");
    };
    let k = b - a + 1;
    let at = if a == b {
        short(a)
    } else {
        format!("{} to {}", short(a), short(b))
    };
    format!("{at}, {k} {}", if k == 1 { "day" } else { "days" })
}

const STEPS: [(&str, &str, Dir, bool); 8] = [
    ("body", "One day earlier", Dir::Left, false),
    ("body", "One day later", Dir::Right, false),
    ("body", "One week earlier", Dir::Left, true),
    ("body", "One week later", Dir::Right, true),
    ("start", "Start one day earlier", Dir::Left, false),
    ("start", "Start one day later", Dir::Right, false),
    ("end", "End one day earlier", Dir::Left, false),
    ("end", "End one day later", Dir::Right, false),
];

impl Timeline {
    fn range(&self) -> Option<(i64, i64)> {
        Some((day(&self.from)?, day(&self.to)?))
    }

    fn track(&self, id: &str) -> Option<&TimeRow> {
        self.tracks.iter().find(|r| r.id == id)
    }

    fn bar(&self, id: &str) -> Option<(&TimeRow, &TimeBar)> {
        self.tracks
            .iter()
            .find_map(|r| r.bars.iter().find(|b| b.id == id).map(|b| (r, b)))
    }

    fn first_free(&self, r: &TimeRow) -> Option<i64> {
        let (from, to) = self.range()?;
        (from..=to).find(|d| !r.bars.iter().any(|b| covers(b, *d, *d)))
    }

    fn fits(&self, grab: &BarGrab, a: i64, b: i64) -> Option<DaySpan> {
        let (from, to) = self.range()?;
        let span = |id: Option<&str>, row: Option<&str>| DaySpan {
            id: id.map(Into::into),
            row: row.map(Into::into),
            start: iso(a),
            end: iso(b),
        };
        match grab {
            BarGrab::Bar { bar, .. } => {
                let (r, x) = self.bar(bar)?;
                let (s, e) = (day(&x.start)?, day(&x.end)?);
                let past = (a != s && a < from) || (b != e && b > to);
                let onto = r
                    .bars
                    .iter()
                    .any(|o| o.id != x.id && o.fixed == Some(true) && covers(o, a, b));
                (!past && !onto && a <= b).then(|| span(Some(bar), None))
            }
            BarGrab::Row { row } => {
                let r = self.track(row)?;
                let free = !r.bars.iter().any(|o| covers(o, a, b));
                (free && a >= from && b <= to && a <= b).then(|| span(None, Some(row)))
            }
        }
    }

    fn edit(&self, grab: &BarGrab, from: &DaySpan, by: i64) -> Option<DaySpan> {
        let (a, b) = (day(&from.start)?, day(&from.end)?);
        match grab {
            BarGrab::Bar {
                part: BarPart::Body, ..
            } => self.fits(grab, a + by, b + by),
            BarGrab::Bar {
                part: BarPart::Start, ..
            } => self.fits(grab, (a + by).min(b), b),
            BarGrab::Bar { part: BarPart::End, .. } => self.fits(grab, a, (b + by).max(a)),
            BarGrab::Row { .. } if by >= 0 => self.fits(grab, a, a + by),
            BarGrab::Row { .. } => self.fits(grab, a + by, a),
        }
    }
}

fn covers(b: &TimeBar, a: i64, z: i64) -> bool {
    day(&b.start).zip(day(&b.end)).is_some_and(|(s, e)| s <= z && e >= a)
}

impl Rules for Timeline {
    type Grab = BarGrab;
    type Reach = Days;
    type Change = DaySpan;

    fn word(&self, grab: &BarGrab) -> Option<Word> {
        match grab {
            BarGrab::Bar { bar, part } => {
                let (_, x) = self.bar(bar).filter(|(_, x)| x.fixed != Some(true))?;
                day(&x.start).zip(day(&x.end))?;
                match part {
                    BarPart::Body => self.moves.as_ref().map(|_| Word::Move),
                    BarPart::Start | BarPart::End => self.stretch.as_ref().map(|_| Word::Stretch),
                }
            }
            BarGrab::Row { row } => {
                let free = self.track(row).and_then(|r| self.first_free(r));
                (self.draw.is_some() && free.is_some()).then_some(Word::Draw)
            }
        }
    }

    fn start(&self, grab: &BarGrab) -> Option<DaySpan> {
        self.word(grab)?;
        match grab {
            BarGrab::Bar { bar, .. } => self.bar(bar).map(|(_, x)| DaySpan {
                id: Some(x.id.clone()),
                row: None,
                start: x.start.clone(),
                end: x.end.clone(),
            }),
            BarGrab::Row { row } => {
                let d = iso(self.first_free(self.track(row)?)?);
                Some(DaySpan {
                    start: d.clone(),
                    end: d,
                    ..DaySpan::default()
                })
            }
        }
    }

    fn candidate(&self, grab: &BarGrab, reach: &Days) -> Option<DaySpan> {
        let mut base = self.start(grab)?;
        if let (BarGrab::Row { .. }, Some(f)) = (grab, &reach.from) {
            base.start.clone_from(f);
            base.end.clone_from(f);
        }
        self.edit(grab, &base, reach.days)
    }

    fn nudge(&self, grab: &BarGrab, from: &DaySpan, by: Nudge) -> Option<DaySpan> {
        let step: i64 = if by.big { 7 } else { 1 };
        let by = match by.dir {
            Dir::Left => -step,
            Dir::Right => step,
            Dir::Up | Dir::Down => return None,
        };
        let next = match grab {
            BarGrab::Row { .. } if from.row.is_none() => self.edit(grab, from, (by.abs() - 1).min(6)),
            BarGrab::Row { .. } => {
                let (a, b) = (day(&from.start)?, day(&from.end)?);
                self.fits(grab, a, (b + by).max(a))
            }
            BarGrab::Bar { .. } => self.edit(grab, from, by),
        }?;
        (next != *from).then_some(next)
    }

    fn steps(&self, grab: &BarGrab) -> Vec<(String, Nudge)> {
        let Some(start) = self.start(grab) else { return vec![] };
        let part = match grab {
            BarGrab::Bar {
                part: BarPart::Body, ..
            } => "body",
            BarGrab::Bar {
                part: BarPart::Start, ..
            } => "start",
            BarGrab::Bar { part: BarPart::End, .. } => "end",
            BarGrab::Row { .. } => {
                return vec![(
                    "Add a bar".into(),
                    Nudge {
                        dir: Dir::Right,
                        big: false,
                    },
                )]
            }
        };
        STEPS
            .iter()
            .filter(|(p, ..)| *p == part)
            .map(|(_, name, dir, big)| ((*name).to_string(), Nudge { dir: *dir, big: *big }))
            .filter(|(_, n)| self.nudge(grab, &start, *n).is_some())
            .collect()
    }

    fn says(&self, _: &BarGrab, change: &DaySpan) -> String {
        words(&change.start, &change.end)
    }
}

type SampleBar = (
    &'static str,
    &'static str,
    &'static str,
    &'static str,
    &'static str,
    Option<u8>,
    bool,
);

const SAMPLE: [(&str, &str, &str, &[SampleBar]); 8] = [
    (
        "j0",
        "St Anne's annexe",
        "Crew 3 · fit-out",
        &[("b01", "2026-11-23", "2026-12-04", "Fit-out", "", Some(80), false)],
    ),
    (
        "j1",
        "Riverside Tower A",
        "Crew 1",
        &[
            ("b11", "2026-12-01", "2026-12-04", "Formwork", "ok", Some(100), false),
            ("b12", "2026-12-07", "2026-12-09", "Pour", "", None, false),
            ("b13", "2026-12-14", "2026-12-22", "Cure", "info", None, false),
        ],
    ),
    (
        "j2",
        "Riverside Tower B",
        "Crew 2",
        &[
            ("b21", "2026-12-02", "2026-12-08", "Excavate", "", Some(60), false),
            ("b22", "2026-12-11", "2026-12-18", "Footings", "", None, false),
        ],
    ),
    (
        "j3",
        "Marlow Street flats",
        "Crew 3 · behind",
        &[
            ("b31", "2026-12-07", "2026-12-23", "Brickwork", "warn", Some(30), false),
            ("b32", "2026-12-28", "2026-12-28", "Inspect", "", None, false),
        ],
    ),
    (
        "j4",
        "Kingfisher school hall",
        "Crew 1 · finished",
        &[
            ("b41", "2026-12-01", "2026-12-03", "Roof", "ok", Some(100), true),
            ("b42", "2026-12-07", "2026-12-08", "Snag list", "", Some(100), true),
        ],
    ),
    (
        "j5",
        "Quayside car park",
        "Crew 4",
        &[
            (
                "b51",
                "2026-12-15",
                "2026-12-18",
                "Resurface · no permit",
                "bad",
                None,
                false,
            ),
            ("b52", "2026-12-21", "2026-12-22", "Lines", "", None, false),
        ],
    ),
    ("j6", "Old Mill conversion", "unassigned", &[]),
    (
        "j7",
        "Pier Road drainage",
        "Crew 2",
        &[
            ("b71", "2026-12-21", "2026-12-23", "Survey", "", None, false),
            ("b72", "2026-12-28", "2027-01-08", "Dig", "accent", None, false),
        ],
    ),
];

pub(super) fn sample() -> Block {
    let bar = |(id, start, end, label, tone, progress, fixed): &SampleBar| TimeBar {
        id: (*id).into(),
        start: (*start).into(),
        end: (*end).into(),
        label: Some((*label).into()),
        tone: serde_json::from_value(serde_json::Value::from(*tone))
            .ok()
            .filter(|_| !tone.is_empty()),
        progress: *progress,
        fixed: fixed.then_some(true),
        tap: None,
    };
    let tracks = SAMPLE.iter().map(|(id, title, subtitle, bars)| TimeRow {
        id: (*id).into(),
        title: (*title).into(),
        subtitle: Some((*subtitle).into()),
        bars: bars.iter().map(bar).collect(),
        tap: None,
    });
    let off = ["05", "06", "10", "12", "13", "19", "20", "26", "27", "31"].map(|d| format!("2026-12-{d}"));
    let schedule = Gesture {
        action: "schedule".into(),
        name: "bar".into(),
        enabled: None,
    };
    Block::Timeline(Box::new(
        Timeline::new("2026-12-01", "2026-12-31", tracks.collect::<Vec<_>>())
            .id("plan")
            .title("Crews")
            .off(off.to_vec())
            .moves(schedule.clone())
            .stretch(schedule.clone())
            .draw(schedule),
    ))
}

#[cfg(test)]
mod tests {
    use super::{day, iso};

    #[test]
    fn a_day_number_and_its_iso_day_turn_into_each_other() {
        for (s, n) in [
            ("1970-01-01", 0),
            ("2026-12-01", 20_788),
            ("2000-02-29", 11_016),
            ("1969-12-31", -1),
        ] {
            assert_eq!((day(s), iso(n)), (Some(n), s.to_string()));
        }
        for bad in ["2026-02-30", "2026-13-01", "26-12-01", "2026-12-1", "x"] {
            assert_eq!(day(bad), None, "{bad}");
        }
    }
}
