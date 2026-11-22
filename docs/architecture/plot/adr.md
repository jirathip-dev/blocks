# ADR: a live line plot (#351)

## Summary

Decision: a new core kind, plot, beside chart, which stays as it is. A plot holds each line's points as two lists
of numbers; one new op adds points to the end of a line and drops old ones from its front. Every renderer draws a
plot at most once per display frame, in the same elements. Measured at 4,800 points: a frame costs under 1 ms in
the browser; SwiftUI's way of applying an op takes 13 ms today, so that op and a merge get a direct path there.
Slices: five, about 1,000 lines, one PR: the data and the op; the shared drawing rules; HTML; SwiftUI; the showcase.
Open questions: (1) elapsed time only on the time axis, clock time later? (2) add a SwiftUI speed gate to the AC?

## Question

How does a line chart over a numeric or time x axis become a blocks kind, how do points reach it at 80 a second
without sending the screen again, and how does each renderer keep that inside a 16.7 ms frame?

## What exists, read from the code

- `chart` plots names on x: `x: Vec<String>` and one value per name in each series. Its tap, its `selected`, its
  point move (`PointGrab` names a point by its x text), its formats and its eras all rest on that. Its drawing
  math is written three times: the static writer, TS and Swift.
- `append` grows a `prose` block and nothing else. `apply` is typed in Rust. In TS it copies the whole screen
  for every stream frame (`structuredClone`). In Swift it turns the whole screen into a JSON tree and back for
  every batch (`Block.apply`).
- The HTML patcher draws the ops queued within one animation frame in one pass. It redraws a block on any
  `merge` and hands an `append` to the prose view. `stream.ts` hands a key's ops over once per animation frame.
- `Shelf::put` takes a whole screen: it serializes it, parses the old one and diffs. Its ring keeps 16 frames
  or 64 KB.
- The frame gate (`docs/headless.md`, `web/test/shot.test.ts`): every frame in 16.7 ms, each frame's patch in 4 ms.
- A client that meets an op it does not know asks for the whole screen; a kind it does not know is drawn as its
  fallback (`docs/schema/versioning.md`).
- React draws `chart`, `lines`, `steps` and `toast` as fallbacks today; egui draws a kind with no view the same way.
- Three shared files are near their line limits: `Apply.swift` (273 of 290), `web/test/shot.test.ts` (313 of
  320) and `ApplyTests.swift` (280 of 290). `web/src/patch.ts` has room (124 of 200).

## Options

### 1. A new kind, or `chart` extended

| | A. `chart` with a `live` kind | B. A new kind, `plot` |
|---|---|---|
| x | `x: Vec<String>` stays required and empty; a second, numeric x beside it | numbers only |
| A series | `values`, one per name, beside a new list of points | points only |
| Fields that mean nothing on a live chart | `selected`, `tap`, `move`, `step`, `fixed`, `as`, `format`, `era`, `lang` | none |
| What can be built wrong | names with points, points with a donut, a move on a point that has no name | nothing new |
| The three chart views | each gains a second drawing inside it | untouched |
| An app's ladder (`docs/extending.md`) | step 2, a named variant; but it is a second data shape, not a look | step 3, a new core kind |

### 2. How a series holds its points

Measured in WebKit on a screen of six stats and one plot (`measured.md`):

| | Objects `{x, y}` | Pairs `[x, y]` | Two columns `x: []`, `y: []` |
|---|---|---|---|
| The screen at 4,800 points | 102 KB | 63 KB | 53 KB |
| TS copies the screen, per stream frame | 1.1 to 1.3 ms | 0.55 to 0.67 ms | 0.17 to 0.18 ms |
| Swift reads the screen once | 3.4 ms | not run | 1.8 ms |
| A wrong state | none | a pair of one or three | columns of two lengths |
| Precedent | none | `media`'s `path` | `chart`'s `x` and `values` |

### 3. How a new point reaches a client

Measured in the crate at 80 frames a second (`measured.md`):

| | `merge` of `series`, as today | A new op; the client trims by the window | A new op that says what to drop |
|---|---|---|---|
| A frame at 2,400 points | 28 KB: 2.3 MB a second | about 115 bytes: 9 KB a second | the same |
| What every client must agree on | nothing | a rule with arithmetic on x, in three languages, and the server's copy of it | counting |
| If the rules differ by one point | — | `diff`'s check fails and every frame is the whole series, silently | cannot differ |
| A server that thins a long series | a `merge` | needs a second rule | a `merge`, once |

### 4. How a renderer draws 80 points a second

| | Redraw the plot on each op, as `merge` does today | Draw each changed plot once per frame, in place |
|---|---|---|
| Draws per frame, two series and a moving peak | 3 to 6 | 1 |
| One draw at 4,800 points | 0.96 to 1.3 ms, every point | 0.47 to 0.54 ms, thinned to 1,000 columns |
| One draw at 28,800 points | 4.9 to 8.5 ms | 0.70 to 0.79 ms |
| The elements | new each time | the same |

## Decision

1. **A new core kind, `plot`** (B). `chart` is not changed, replaced or deprecated: it plots names, `plot`
   plots numbers. No field of either means nothing.
2. **A plot is a title, up to five series, two axes, a window, a target and a peak** (`shapes.md`). An axis has a
   label, a unit, an optional fixed range and a scale: numbers, or seconds drawn as `m:ss`. One y axis.
3. **A series holds two columns, `x` and `y`.** It is the cheapest shape in every client by a wide margin, and
   the one wrong state, two lengths, is refused by `Plot::unfit` on the server and does not fit as an op.
4. **One new op, `points`**: it names a plot by id and a series by name, drops `drop` points from the front,
   then adds `x` and `y` at the end. It counts and copies; no client does arithmetic.
5. **`diff` writes it.** An app builds the next screen and puts it, as for every other change. `Shelf`, `Mirror`
   and `Replica` keep their signatures. A core that hands ops to a view in its own process may write the op
   itself: it is an ordinary public op.
6. **The server keeps a series bounded; a client only follows.** `Plot::push` adds a point and drops what the
   window no longer shows. With no window, a series that reaches 20,000 points is halved, keeping each four's
   lowest and highest, so a whole session keeps its span and its peaks. `Plot::unfit` refuses a longer series.
7. **The target and the peak are fields**, changed by `merge` as any field is.
8. **Older clients and the old stream.** `wire::old` turns a plot's `points` into one `merge` of its `series`.
   The wire version stays 2: a new kind and a new op are additive.
9. **One `drawn` per language.** `Plot::drawn` gives both ranges, the ticks with their text, and for each
   series the indices of the points to join, thinned to 1,000 columns past 2,000 points. No renderer works out
   a range, a tick or a thinned line by itself.
10. **Every renderer draws a plot at most once per display frame, in place** (`boundaries.md`):
    - HTML: the patcher marks a plot touched by `points` or `merge`, and after the pass's ops draws each marked
      plot once into its own elements (`sync`). The stream already hands over one batch per animation frame.
    - SwiftUI: `Replica.frames` already takes a burst in one mutation. `Block.apply` reaches the block of a
      `points` or a `merge` by a typed walk, and a merge on a plot leaves its points where they are. The view is
      a `Canvas` drawn from `drawn`.
    - The static page writes the same marks once. React and egui draw the fallback, as for `chart` in React today.
11. **Two gates.** HTML, as the AC asks: 80 `points` a second for 60 s on a plot with no window keeps every
    frame in 16.7 ms and each patch in 4 ms. Swift (open question 2): each frame of the same stream, with a stat
    merged and the peak moved, is applied in 2 ms.

## Consequences

- An app streams with one call per sample (`push`) and its usual `put`. It gives the plot an `id`.
- `Shelf::put` still costs what the screen costs: 0.6 ms at 2,400 points and 1.2 ms at 4,800 on a desktop core.
  An app puts once per display frame at most; the samples between two puts ride in one op.
- A client built before `points` asks for the whole screen on every frame and draws the fallback. An app ships
  its clients first, then lets its server stream, as for `append`.
- A reconnect during a stream gets the whole screen: at 60 frames a second the shelf's ring holds a quarter second.
- The y range follows the points unless the app fixes it, so it can jump when a high point leaves the window.
  A live plot should set `y.min` and `y.max`.
- Force in kg and heart rate in bpm are two plots, one above the other: there is one y axis.
- A whole session at 80 points a second is halved when it reaches 20,000 points: first after 4 minutes, then
  every 2. It loses detail, never its span or its extremes. Each halving sends that series once, about 125 KB.
- `drawn` is written three times, as chart's math is. The cases in `fixtures/plot/` and the test that the
  static writer and the live renderer write the same marks hold them together.
- Swift's `Block.apply` still costs the whole screen for `insert`, `move`, `remove`, `replace` and `append`.
  On a screen with a live plot those take 7 to 13 ms each. They are rare during a stream; a typed `apply` for
  all ops is not this issue.
- React and egui show a plot's title as a row until each gets a view of its own.

## Hot files

- **Central lists.** The lists of kinds are generated: the kind is new files (`blocks new kind plot` writes
  five) and `just gen`. `tree.rs`'s `ROLES` and `built.rs`'s unfit match take one line each; neither is frozen or shared.
- **`web/src/patch.ts`** (shared, 124 of 200 lines) gains about 12: the mark and the late draw. It names no
  kind: the host hands it a table of in-place views by kind, as it hands it `grow` today. The plot's own code is
  `render/kind/plot.ts`.
- **`swift/Sources/Blocks/Apply.swift`** (shared, 273 of 290) gains two short arms. The typed walk is a new file,
  `swift/Sources/Blocks/Walk.swift`; the plot's rules are `Kind/Plot+Rules.swift`.
- **Tests** go in new files, not the shared ones at their limits: `web/test/kind/plot.test.ts` (the perf check
  too), `crates/blocks/tests/plot.rs`, `crates/blocks/tests/site_plot.rs`, `swift/Tests/BlocksTests/PlotTests.swift`.
- **Generated files** are regenerated by `just gen`, never merged by hand: the schema, the TS and Swift types and
  builders, `fixtures/blocks/`, `html/`, `trees/`, `ids/`, `skill/` and the stream fixture below.
- **Docs** are one file per area already: the op in `docs/schema/stream.md`, the kind in `docs/schema/blocks.md`.

## The `.drover/arch.toml` lines

The PR that adds the kind adds one entry to the `generated` list, beside `"fixtures/protocol/sim-*.json"`:

```toml
    "fixtures/plot/stream.json",
```

Nothing else changes: the new files fall under the layers, collected folders and size limits that exist. The
other files in `fixtures/plot/` are kept by hand, like `fixtures/append/`. This issue freezes no file.
