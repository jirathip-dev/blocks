# plot: a live line plot in every renderer (#351)

## Summary

Decision: a new core kind, plot, beside chart, which stays as it is. A plot holds each line's points as two lists
of numbers; one new op adds points to the end of a line and drops old ones from its front. Every renderer draws a
plot at most once per display frame, in the same elements. Measured at 4,800 points: a frame costs under 1 ms in
the browser; SwiftUI's way of applying an op takes 13 ms today, so that op and a merge get a direct path there.
Slices: five, about 1,000 lines, one PR: the data and the op; the shared drawing rules; HTML; SwiftUI; the showcase.
Open questions: (1) elapsed time only on the time axis, clock time later? (2) add a SwiftUI speed gate to the AC?

## Read in this order

| File | What |
|---|---|
| `usage.md` | how the callers read: an app that streams, the frame it sends, a web page, a Swift app, the tests |
| `adr.md` | the question, what exists, four options with their measured cost, the decision in eleven parts, consequences, hot files, the `.drover/arch.toml` line |
| `shapes.md` | the kind, what is unfit, the op and its three rules, what `diff` writes, the builder, `drawn`, the fixtures |
| `boundaries.md` | which module gains what, what happens to a frame in each renderer, three statecharts |
| `measured.md` | the shape of a series, drawing, the crate and Swift, measured; what was not |

## The kind at a glance

| The issue asks for | It is | Changes by |
|---|---|---|
| series of (x, y) points, each with a name and a tone | `series`: up to five, each `name`, `tone` and two columns, `x` and `y` | the new `points` |
| a numeric or time x axis | `x.scale`: `number`, or `time` for seconds drawn as `m:ss` | set with the plot |
| points streamed in at about 80 a second | `points`: a plot's id, a series' name, how many to drop from the front, the new `x` and `y` | `diff` writes it from the app's next screen |
| a window, or the whole session | `window`, a span of x; none shows every point held | `merge` |
| a target band | `target`: `min` and `max` on y | `merge` |
| a peak line with a label | `peak`: `y` and `label` | `merge` |
| axis labels and units | `x` and `y`: `label`, `unit`, and an optional fixed `min` and `max` | set with the plot |

## The slices, in order

One PR on this branch. Counted lines are an estimate from `chart`'s size in each renderer; the cap has 21,900
lines of room (`drover cap blocks`).

| | Slice | Builds | Needs the design | Counted |
|---|---|---|---|---|
| P0 | this PR's first commit | this folder | | 0 |
| P1 | the data and the op | `Plot` and its parts, `unfit`, `push`; `points` in `wire`, `patch`, `diff` and `wire::old`; `grow` and `apply` in TS; the typed walk, `grow` and the plot's merge in Swift; `fixtures/plot/`; `docs/schema/`; placeholder views from `blocks new kind plot` | no | +350 |
| P2 | the drawing rules | `drawn` in Rust, TS and Swift, and its cases | the ticks | +220 |
| P3 | HTML | `render/kind/plot.ts` (draw and `sync`), its CSS, the patcher's late draw, the static writer, the stress row, the perf check | yes | +250 |
| P4 | SwiftUI | `Kind/Plot.swift` on a `Canvas`, the snapshot checks, the Swift gate | yes | +130 |
| P5 | the showcase | the two samples and a page that plays `fixtures/plot/stream.json` | yes | +40 |

P1 has no look, so it can be built while the design is drawn.

## What the design stage draws

At 1,440 and 390, light and dark, on the default look:

- the AC's plot: a target, a peak line with its label and two series, with a legend
- a static plot of one series over a time axis, and one over a plain numeric axis with a unit
- a live plot in its window: where the newest point sits, and how the line meets the left edge
- the ticks: how many on each axis at both widths, and where the label and the unit go
- a peak label near the top edge, and one that meets the target; a long title and a long series name
- the empty plot
- whether the newest value is shown as text beside the series' name

## Open questions

1. **The time axis.** `time` reads x as seconds and draws `0:30`, `1:00`. That fits a pull and a session, and
   needs no clock or time zone. Clock time (`14:05`) would be one more word on `scale` later, added without a
   version change. Elapsed only for now (recommended), or clock time in this issue?
2. **A Swift gate.** The AC asks for a perf check in the HTML renderer only. Today's Swift `apply` takes 7 to
   13 ms a frame on a screen that holds this plot (`measured.md` part 4), so the direct path is in the decision
   either way. Add the gate that keeps it, each frame applied in 2 ms (recommended), or leave the AC as written?

## Where each ask of the issue is answered

| The issue asks | Where |
|---|---|
| a new kind or an extension of `chart` | `adr.md` option 1, decision 1 |
| the point-append op | `shapes.md`, The op; `adr.md` option 3, decisions 4 to 6 |
| its `wire::old` form | `shapes.md`, What `diff` writes; `adr.md` decision 8 |
| how the renderers batch 80 appends a second into frames | `adr.md` option 4, decision 10; `boundaries.md`, What happens to a frame |
| the fixtures, and three languages on one result | `shapes.md`, Fixtures; `usage.md` part 6 |
| the perf check | `adr.md` decision 11; `usage.md` part 6 |

## What was read

- blocks `staging` at `73adae31`: `kind/` (macros, `chart`, `prose`, `parts`), `wire.rs`, `patch.rs`, `diff.rs`,
  `shelf.rs`, `mirror.rs`, `built.rs`, `tree.rs`, `site/kind/chart.rs`; `web/src/patch.ts`, `stream.ts`,
  `core/apply.ts`, `core/kind/prose.ts`, `render/kind/chart.ts` and `prose.ts`, `shell/host.ts`, `web/shot/shot.ts`,
  `web/test/shot.test.ts`; `Apply.swift`, `JSONValue.swift`, `Kind/Chart.swift`; `blocks-desktop`'s `draw.rs`;
  `blocks-cli`'s `new.rs`; `docs/schema/`, `docs/headless.md`, `docs/extending.md`, `.drover/arch.toml`.
- `docs/architecture/message/` (the `append` op, #296), for the op's precedent.
