# gestures: one gesture-to-action model (#136)

## Summary

Decision: a block names the gestures it allows; the renderer only previews and sends one action on release; the app
decides. Drag, keys and screen-reader actions share one state machine and must send the same action. Layout too.
Slices: the core with list reorder moved onto it (this issue), then timeline, grid, marks, pages, chart points and
layout, one issue each: about 4,900 counted lines.
Open questions: (1) one cap raise for these slices? (2) park #139 and trace the tower curve with marks (#140)?
(3) file the React views the client app needs per family, when it migrates each screen?

## Read in this order

| File | What |
|---|---|
| `usage.md` | how the callers read: a Rust server, a client-built route, a kind's author in the web renderer and in SwiftUI, a test |
| `adr.md` | the question, what exists, the options, the decision in twelve parts, consequences, islands, the three open questions, hot files, the `.drover/arch.toml` lines |
| `boundaries.md` | who may call whom, the gesture's statechart, the layout edit mode's, what every view meets, and per gesture its keys, its screen-reader actions, its motion and reduced motion |
| `shapes.md` | the declaration, the machine, a kind's rules, each family's shapes, layout's edit, what changes in `expr` and `behave`, the fixtures |
| `families.md` | the six families with the client app's screens as worked cases, and what is left an island |

## The model in one picture

```text
the block       { …its data…, move: { action: "schedule", name: "bar" } }
                     │  a pointer, the keys, or a named screen-reader action
the renderer    the driver asks the kind's rules for a candidate, steps the machine,
                and shows the candidate by transform and opacity; the model is untouched
                     │  release
one action      { screen, block, action: "schedule", values: { bar: { id, start, end } } }
                     │
the app         answers with ops: the item is drawn from the data            (confirmed)
                fails the action with a toast: the item goes back, with why   (refused)
```

## The families at a glance

| Family | Kind | Gestures that send an action | The result | the client app's case |
|---|---|---|---|---|
| time axis | `timeline`, new (#137) | `move`, `stretch`, `draw` | a bar's days | the planner; the activity Gantt as a read-only one |
| grid | `table` (#138) | `edit`, `reorder`; `calc` for live cells | a cell's value; the row order | product mark-up; the costing grid needs nothing; the workspace is `lines` |
| marks on an image | `media` (#140) | `draw`, `move`, `stretch`, `remove` | a mark | photo markup; the tower curve |
| documents | `pages`, new (#141) | none: zoom and paging are view gestures | | the report and quotation previews |
| plot | `chart` (#139) | `move` | a point's value | none found: open question 2 |
| layout | the shell (#130) | move and swap a node, set how it shows | one `Edit` | cooee's layout |
| list | `list` (today) | `reorder` | the row order | cooee's accounts |

## The slices, in order

Counted lines are non-test, non-generated lines under `ci/cap.toml`: 19,497 of 23,000 at staging `95bafad`, 3,245
left after the open PRs (`drover cap blocks`), which the queued desktop, guard, react and form slices also need.
The numbers below are estimates from the size of `table`, `lines` and `steps` in each renderer.

| | Slice | Builds | Counted | After |
|---|---|---|---|---|
| G0 | #136, this PR | this folder | 0 | |
| G1 | #136, on this branch once approved | the core: the machine three times; `Gesture` and `Word`; `Rules`; `div`; the `behave` and check rules; `Action::read`; the `gesture` and `refuse` steps; the web driver and `Gestured.swift`; `held` and `view`; `list`'s `reorder` and the image viewer's zoom moved onto it in both renderers; the machine, sim and list fixtures; the bans; `docs/schema/gestures.md` | +950 | |
| G2 | #137 timeline (design first) | the kind, its day arithmetic and rules three times, both views, the static page, its fixtures | +1,150 | G1, #152, #155 |
| G3 | #138 grid (design first) | `edit`, `reorder` and `calc` on `table`, the cell rules three times, both views | +750 | G1, #152, #155 |
| G4 | #140 marks (design first) | marks, tools and the four gestures on `media`, the rules three times, both views | +800 | G1, #152, #155 |
| G5 | #141 pages (design first) | the kind and both views; no rules | +350 | G1, #152, #155 |
| G6 | #130 layout | `layout::edit`, `slots`; `drops` three times; the edit mode in `shell.ts` and `SlotView`; `fixtures/layouts/edits.json` | +650 | G1 |
| G7 | #139 chart point (design first) | `move` on `chart`, its rules three times | +250 | G1, #132; open question 2 |

G2 to G7 do not depend on each other. Each kind's React view is its own later issue (open question 3).

## Where each ask of the issue is answered

| The issue asks | Where |
|---|---|
| question, options, decision, consequences | `adr.md` |
| the data shapes | `shapes.md` |
| a statechart for a gesture: idle, pressed, dragging, previewing, sent, confirmed, refused | `boundaries.md`, statechart 1 |
| the callers' usage | `usage.md` |
| each family, with the client app's islands as worked cases | `families.md` parts 1 to 5 |
| layout, #130 folded in | `families.md` part 6; `boundaries.md`, statechart 2; `shapes.md` part 5 |
| per gesture: keyboard and VoiceOver path, reduced motion, motion held to the rule | `boundaries.md`, the last table |
| the web renderer and SwiftUI, with cross-language fixtures | `usage.md` parts 3 to 5; `shapes.md` parts 7 and 8 |
| how `behave` and `expr` are used or extended | `adr.md` part 10; `shapes.md` part 6 |
| what stays an island, and why | `adr.md`; the last table of `families.md` |
| no new dependency; no client app, drover or cooee names in blocks code | none is added; the cases are fixtures with made-up names |

## What was read

- blocks `staging` at `95bafad`: `kind/`, `expr.rs`, `behave.rs`, `wire.rs`, `patch.rs`, `built.rs`, `tree.rs`,
  `layout.rs`, `web/src/render/` (`index`, `list`, `lines`, `row`, `images`), `patch.ts`, `behave.ts`, `shell.ts`,
  `motion.ts`, `web/shot/shot.ts`, `BlockEdits.swift`, `BlockRows.swift`, `SlotView.swift`, `.drover/arch.toml`,
  and the ADRs of #81, #113 and #131.
- The issues #130, #132, #135 and #137 to #141.
- The client app's repo: `docs/blocks-migration/inventory.md` at `a2ae461dc3`, and the screens it names for the planner,
  the activity Gantt, product mark-up, the costing grid, the service workspace, the tower design curve, photo
  markup, the two document previews and the pack drawing. Three read-only surveys reported each with file and
  line; the lines cited in `families.md` were then checked at `a2ae461dc3`.

Nothing here was built or run. The line counts are estimates.
