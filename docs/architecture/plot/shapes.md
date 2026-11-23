# plot: the data shapes (#351)

Sketches of the wire types as the crate would write them. `just gen` derives the schema, the TS and Swift types,
the builders and the Swift initialisers from them, as for every kind.

## The kind

```rust
words!(AxisScale { Number, Time });

wire! {
    /// A plot's axis: its label and unit, a fixed range, and whether its values read as numbers or as seconds.
    pub struct Axis {
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
pub struct Target { pub min: Number, pub max: Number }

/// A plot's peak: a line across at `y`, with its label.
pub struct Peak { pub y: Number, pub label: String }

kind! {
    /// A line plot of named series over a numeric or time x: points stream in by `points`; a window, a target and a peak.
    pub struct Plot {
        id: Option<String>,
        title: String,
        series: Vec<Trace>,
        x: Option<Axis>,
        y: Option<Axis>,
        window: Option<Number>,
        target: Option<Target>,
        peak: Option<Peak>,
        empty: Option<String>,
    }
}
```

- `Target` and `Peak` hold a bare `Number`, which has no default, so they derive by hand as `PointMove` does.
- `window` is a span of x: the plot shows the last `window` of x up to the newest point. None shows every point held.
- `Axis.min` and `max` fix a range: on y for a steady live axis, on x for a test of a known length (0 to 10 s) that
  the line fills from the left. A fixed x range wins over `window`.
- `scale: time` reads the axis's values as seconds and draws its ticks as `m:ss` (`h:mm:ss` from an hour).
- One y axis. Two units are two plots.

As JSON:

```json
{ "type": "plot", "id": "pull", "title": "Pull", "window": 30,
  "x": { "label": "Time", "scale": "time" },
  "y": { "label": "Force", "unit": "kg", "min": 0, "max": 60 },
  "target": { "min": 20, "max": 30 },
  "peak": { "y": 48.2, "label": "Peak 48.2 kg" },
  "series": [
    { "name": "Force", "tone": "accent", "x": [0.0125, 0.025, 0.0375], "y": [0.4, 1.1, 2.3] },
    { "name": "Last pull", "tone": "mute", "x": [0, 1, 2], "y": [0, 18.5, 31] }
  ] }
```

## What is unfit to send

`Plot::unfit`, called by `Built::check` beside `Chart::unfit`:

| Finds | Says |
|---|---|
| over 5 series | a plot of 6 series: at most 5 |
| two series of one name | two series named Force: `points` names a series by its name |
| a series whose `x` and `y` differ in length | Force has 2,400 x and 2,399 y |
| an `x` that goes back | Force's x goes back at point 12: x only rises |
| a series over `Trace::LIMIT` (20,000 points) | Force has 96,000 points: at most 20,000; `push` keeps a series under it |
| a target or a fixed range whose `min` is over its `max` | the target's min is over its max |

## The op

```rust
Op::Points {
    id: String,
    series: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    drop: Option<usize>,
    x: Vec<Number>,
    y: Vec<Number>,
}
```

```json
{ "op": "points", "id": "pull", "series": "Force", "drop": 2, "x": [30.0125, 30.025], "y": [41.2, 41.6] }
```

Three rules, the same in Rust (`Plot::grow`), TS (`core/kind/plot.ts`) and Swift (`Plot+Rules.swift`):

1. `id` names a `plot` and `series` one of its series by `name`. Else it does not fit.
2. `drop` points leave the front of that series first. A `drop` over the points held does not fit.
3. `x` and `y`, of one length (else it does not fit), go on the end.

It counts points and copies numbers; no language does arithmetic on a value, so all three end on the same
screen. One that does not fit is a gap, answered by the whole screen, as for any op.

## What `diff` writes

For a `plot` whose `series` changed, when the series' names and tones are the same in the same order: one
`points` for each series whose new points are its old ones less a front, plus a tail. `drop` is the front's
length, `x` and `y` the tail. Any other change to `series` (a series added or renamed, a point edited, a series
thinned) is a `merge` of `series`, as today. Other changed fields (`peak`, `target`, `title`) go in a `merge`
before it. `diff` checks its ops against the new screen, as it does for every block.

`wire::old` turns the `points` ops of one plot into one `merge` of that plot's `series`, read from the new screen.

## The builder that streams

```rust
impl Plot {
    /// Adds a point to the series named `series`; false when no series has that name, a number is not finite or x goes back.
    pub fn push(&mut self, series: &str, x: f64, y: f64) -> bool;
}
```

- With a `window`: after the point, every series drops the points older than the newest x less the window,
  but keeps the last of them, so a line enters at the left edge.
- With no `window`: a series that reaches `Trace::LIMIT` is halved: of each four points the lowest and the
  highest stay, in x order. A whole session keeps its span and its peaks at half the detail, and the next `put`
  sends that series once by `merge`.
- It writes a whole value as an integer, as a chart's move does, so the crate's JSON equals what a client holds.

`push` and the halving are the server's only. A client never drops or thins by itself: it does what `points` says.

## What a renderer asks before it draws

```rust
/// What every renderer draws of a plot: both ranges, their ticks, and for each series the points to join.
pub struct Drawn {
    pub x: (f64, f64),
    pub y: (f64, f64),
    pub x_ticks: Vec<Tick>,
    pub y_ticks: Vec<Tick>,
    pub lines: Vec<Vec<usize>>,
}

/// A tick: where it sits on its axis and the text beside it.
pub struct Tick { pub at: f64, pub text: String }

impl Plot {
    pub fn drawn(&self) -> Drawn;
}
```

`drawn` is a pure function of the block, written once per language (`kind/core/plot.rs`, `core/kind/plot.ts`,
`Plot+Rules.swift`) and pinned by shared cases:

| | Rule |
|---|---|
| x range | the axis's `min` and `max` when set; else the last `window` up to the newest x of any series; else the first x to the newest. No points: 0 to the window, or 0 to 1 |
| y range | the axis's `min` and `max` when set; else the points in the x range, the target and the peak, widened to round steps by the rule `chart` uses for a line (`nice`, shared, not copied) |
| ticks | round steps of the range; for `time` the steps are 1, 2, 5, 10, 15 and 30 s, then the same in minutes, then hours. The text is the number at the step's decimals, or `m:ss` |
| lines | the indices of the points in the x range, with one before and one after it. Over 2,000 of them, the x range is cut into 500 columns and each column keeps its first, lowest, highest and last point |

`lines` holds indices, not coordinates, so the three languages agree exactly and the fixture holds whole numbers.
The range depends on the block alone, so it can shrink when a high point leaves the window: an app that wants a
steady axis sets `y.min` and `y.max`.

## Hooks, role and name

| | |
|---|---|
| Role and name | `figure`, named by `title`: one line in `tree.rs`'s `ROLES` |
| Hooks | `b b-plot`, `data-block="plot"`, `data-id`; parts `title`, `legend`, `target`, `peak`, `axis` |
| Text | the title, each series' name, both axes' labels and units, the tick texts and the peak's label are text; the drawing is hidden from a screen reader, as a chart's is. A new point is not announced |
| Empty | no points in any series: `empty`, else the default line a chart shows |

## Fixtures

| File | Kept by | Holds |
|---|---|---|
| `fixtures/blocks/plot.json` | `just gen`, from the kind's sample | a static plot: one series, a time x |
| `fixtures/blocks/plot-target.json` | `just gen` | a target, a peak and two series |
| `fixtures/plot/stream.json` | `just gen`, by `Plot::push` and `diff` | a start screen, 6 s of frames at 80 points a second through a 3 s window, and the end screen |
| `fixtures/plot/*.json`, the rest | hand | one case a file: `drop` over the points, unequal `x` and `y`, no such series, an id that is no plot, a `drop` with nothing added; and `drawn` cases: a window, a fixed range, a time axis, over 2,000 points, no points |
| `fixtures/stress/table.json` | hand, one row | long: `title`, a series' `name`, the peak's `label`; empty: `series`; many: a series at `Trace::LIMIT` |
| `fixtures/html/`, `trees/`, `ids/` | `just gen` | as for every kind |

Rust, TS and Swift each run every file in `fixtures/plot/`: the cases, and the stream to its end screen. The
folder is outside `fixtures/protocol/`, so the compat job's last release is not asked to know the op.
