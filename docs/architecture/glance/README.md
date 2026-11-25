# glance: one block's island and widget forms, drawn by BlocksUI (#412)

## Summary

Decision: a new core kind, `glance`. It has a head every form draws from (title, subtitle, figure, value, tone, tap)
and five optional forms: `leading` and `trailing` replace a side; `expanded`, `small` and `medium` add text, two rows,
a foot and buttons. Only `title` is required. BlocksUI draws a form into the box a host hands it and owns no window.
Slices: three, in this issue's one PR: the kind in the crate; the forms in BlocksUI with their snapshot gate; the doc.
Open questions: (1) cooee also draws a large and two Lock Screen widgets: add those forms later (recommended)?
(2) no design lane, since the layouts follow cooee's shipped surfaces (recommended)?

## Read in this order

| File | What |
|---|---|
| `usage.md` | how the callers read: a server builds one, the wire, a host's Live Activity, widget and notch window, the tests |
| `adr.md` | the question, where it stands, four options, the decision in nine parts, consequences, hot files, the `.drover/arch.toml` lines |
| `shapes.md` | the Rust types, the Swift API, what each form draws and from where, the boxes, the files |
| `boundaries.md` | which module may call which and what enforces it; two statecharts (the island, a block's Live Activity) |

## The answer in one table

| The issue asks | Answer |
|---|---|
| a new kind, or a placement on a screen | a new leaf kind. A placed block would have to be drawn twice (38 of BlocksUI's 45 kind files use state, a closure, a clock, a scroll view, a text field or glass, none of which a widget or an activity may hold), and a side is 24 pt high |
| its name | `glance`. `island` is the client component; `compact` is the iPhone width, and a form is picked by the surface the system hands over, never by a window's width, so `layout::SizeClass` does not change |
| which forms are required | none. `title` is the one required field, so every block draws something in every form |
| how a missing form falls back | a side from the head (its figure; its value); a roomy form from the head plus a sibling's body: `expanded` and `medium` from each other, `small` from `medium`, then `expanded` (`shapes.md`) |
| how a host hands a form to ActivityKit | the block is the activity's content state: `typealias ContentState = Glance`. The app updates it, or the server pushes the block's JSON as `content-state` |
| to WidgetKit | the app writes the screen's JSON to its App Group; the widget's provider decodes it and draws `GlanceView(block, .small)` |
| to a Mac notch window | the app's own panel holds `GlanceView(block, .leading)` and `.trailing` either side of the notch, `.expanded` when open |

## The five forms

A form draws these parts and no more, each text on one line but `line` (two). The harness draws each form in its
box, the smallest the supported devices hand out, and nothing may draw outside it.

| Form | Box, pt | Draws | Taps |
|---|---|---|---|
| `leading` | 60 × 24 | a figure and a text, as given; else the head's figure; else a mark in the head's tone | the surface's one tap |
| `trailing` | 60 × 24 | a figure and a text, as given; else the head's value in its tone; else nothing | the surface's one tap |
| `expanded` | 340 × 140 | figure, title, subtitle, value; two rows, else `line`; foot; two acts | each row, each act |
| `medium` | 289 × 116 | the same; one act | each row, the act |
| `small` | 116 × 116 | figure and title as its label; the value, large; two rows, else `line`; foot | the surface's one tap |

## cooee's surfaces on this shape

| cooee today | On a glance |
|---|---|
| `IslandMark` (leading, minimal) | `leading`: the head's figure, drawn by the app's own figure view (`AppBlocks.figure`) |
| `IslandTrailing` | `trailing`: the head's clock; `{"text": "ask", "tone": "bad"}` when it asks |
| `IslandExpanded`, `LiveActivityCard` | `expanded`: head, line, foot, Stop as an act the host maps to its intent |
| `NeedsSmall` | `small`: title, the count as its value, a line, a foot |
| `RunningSmall` | `small`: title, two rows with their clocks, a foot |
| `GlanceLarge`, `LockCircle`, `LockRect`, the inline text | no form in this issue: open question 1 |

## The slices, in order

Counted lines are non-test, non-generated lines under `ci/cap.toml`: 26,740 of 44,000 at `d79ce47` (`drover cap
blocks`). The three are commits of this issue's one PR: its acceptance list holds all of them, and S2 cannot be
reviewed without S1's types.

| | Slice | Builds | Counted lines |
|---|---|---|---|
| S0 | this folder | the decision | 0 |
| S1 | crate: the kind | `kind/core/glance.rs` (`Glance`, `GlanceSide`, `GlanceBody`, `GlanceRow`, three samples); role `status`; its stress row; guard `glance/heavy`; the fallback draw on the web and the site; `just gen` (schema, TS, Swift types, fixtures, skill) | about +150 |
| S2 | BlocksUI: the forms | `Blocks/Kind/Glance+Rules.swift` (`drawn`, `Hashable`, `Block.glance`); the `BlocksUI/Glance/` folder (`GlanceView`, `glanceTaps`); `Kind/Glance.swift` (in a screen); `blocks-snap --form`; gate `swift-glance`; `GlanceTests`; the `.drover/arch.toml` lines | about +370 |
| S3 | the doc | `docs/glance.md`: the wire, the forms table, the three wirings; its widget and notch code compiled in `AppFixtureTests` | 0 |

The PR body carries a `For apps` line (a new kind, a new public Swift view) and the ten PNGs of
`fixtures/blocks/glance.json` (five forms, light and dark) from the gate's kept files.

## What was read

- blocks at `d79ce47`: `kind/core/` (`island.rs`, `stat.rs`, `row.rs`, `toast.rs`, `sidebar.rs`), `kind/parts.rs`,
  `built.rs`, `layout.rs`, `BlocksUI` (`BlocksView`, `BlockNode`, `ActButton`, `Kind/`, the look), `BlocksSnapshot`,
  the Swift gates, the token lint, `fixtures/stress/table.json`, and #358, the last PR that added a kind.
- cooee's staging on 2026-11-25: `SurfaceIsland.swift` (66 lines), `SurfaceWidgets.swift` (144), the parts they
  share in `Surfaces.swift`, and the widget extension that hosts them (`CooeeWidgets/`).
- Coucou's README only (a borderless panel hugging the notch, `hidden → petit → home`). No code or asset is copied.
- The iOS 27.2 SDK's interfaces: `Button(intent:)` is AppIntents with SwiftUI; `widgetURL`, the `.widget` container
  background and `DynamicIsland` are WidgetKit.
