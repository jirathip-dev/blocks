# ADR: one gesture-to-action model for interactive kinds (#136)

## Summary

Decision: a block names the gestures it allows; the renderer only previews and sends one action on release; the app
decides. Drag, keys and screen-reader actions share one state machine and must send the same action. Layout too.
Slices: the core with list reorder moved onto it (this issue), then timeline, grid, marks, pages, chart points and
layout, one issue each: about 4,900 counted lines.
Open questions: (1) one cap raise for these slices? (2) park #139 and trace the tower curve with marks (#140)?
(3) file the React views synergy needs per family, when it migrates each screen?

Status: proposed (architect lane, 2026-11-19). Read `README.md` first.

## Question

synergy keeps 7 screens and 6 embedded parts as islands because each needs a gesture no kind has: drag a bar,
edit a cell, drag a point, draw on a photo, page through a document. #130 wants one more, dragging a layout's
nodes. What is the one way a kind says which gestures it allows, a renderer runs them, their result reaches the
app, and a person who cannot drag does the same thing, so that six kind issues can each build on it without
writing a gesture rule of their own?

## What exists, read from the code

- One gesture has a shape: a `list`'s `reorder` is `{action, name}` (`kind/parts.rs:440`), and a row has `handle`
  and `lifted` (`kind/mod.rs:90`). cooee sends it (`fixtures/screens/cooee/fleets-config-role.json`).
- SwiftUI runs it with `.draggable` and `.dropDestination` (`BlockEdits.swift:142`) and sends the new order on the
  drop. It has no keys, no VoiceOver action, no pending look and nothing for a refusal.
- The HTML renderer does not run it at all: `render/list.ts` is 8 lines and draws no handle.
- Four more gestures are each written alone, and all four only change the view: a row's swipe (`row.ts:94`), the
  image viewer's pinch and swipe (`images.ts:73`), SwiftUI's pinch (`BlockImages.swift:44`) and swipe
  (`BlockActs.swift:52`).
- An action's `values` is any JSON (`wire.rs:75`). `act` resolves `true` or `false` (`render/index.ts:42`); a
  failed request shows its body's `toast` (`shell.ts:289`). Nothing else says an action was refused.
- The patcher redraws a block it merges into (`patch.ts:111`), so a view that keeps a drag, a zoom or a scroll in
  its own elements loses it when the screen changes.
- Which list a kind's children are in is written by hand in four files (`patch.rs:85`, `built.rs:53`,
  `patch.ts:10`, `Apply.swift:156`).
- `lines` works out a row's `calc` by `expr` as you type and sums its columns (`render/lines.ts:50`, `:65`). `expr`
  has `add`, `sub` and `mul` and no division (`expr.rs:56`).
- `behave::view` lists the actions whose `enabled` does not hold (`behave.rs:16`).
- Motion is a token times `--motion`, and reduced motion turns every transition off (`css/look/motion.css:6`,
  `Tiles.swift:50`).
- `layout::check` reads a file's text and refuses one that places a locked screen (`layout.rs:235`, `:311`). The
  shell is handed a checked layout (`shell.ts:41`). Nothing edits one.
- The harness steps are tap, type, scroll, frame, answer and shot (`tree.rs:116`).
- synergy (`families.md`): only the planner has bar drags; the activity Gantt is edited by number inputs. Product
  mark-up is the one real grid; the costing grid is read-only and the service workspace is forms. The tower curve
  is traced over a scanned picture, not dragged on a chart. The document previews take no input. None of them sends a gesture
  as it happens: the planner asks in a sheet first, the grid and the forms save the whole document 1.5 s after
  the last key, the marks and the traced curve are saved with their document. No drag in any of them has a
  keyboard path.

## Options

| Question | Options | Chosen |
|---|---|---|
| Where a gesture's rules live | **A** each kind writes its own, as `reorder` is today; **B** one machine and one small vocabulary, with each kind's rules as pure functions; **C** a canvas kind whose gestures are scripted in `expr`; **D** leave them islands | **B**. A is five more copies of what SwiftUI's `reorder` got wrong. C puts hit-testing and geometry into a language that has neither. D keeps 13 parts of synergy outside the check, the look and the tree tests |
| What is drawn between the drop and the answer | apply it to the model and roll back on a refusal; put it back and wait; hold the candidate outside the model | hold it. The model stays what the app said, so `diff`, the stream and a reconnect need no undo, and "nothing saved before the app confirms" is true by construction |
| The shape of the result | an op the client proposes (a `merge` of the item); the block's whole new value; a typed result per gesture, under the declared `name` | typed. A handler wants `{id, start, end}`, not a map of fields; a client-built app has no ops; and `{action, name}` with the ids under `name` is what `reorder` sends today |
| How a refusal is said | a new field on `Answer`; a new stream message; the action failing, as now | as now. One way to fail an action, and no wire change |
| How the app's change comes back | item ops per kind (a `Child`, a patcher case and a diff rule each, in three languages); a `merge` of the block's changed list | the merge. Four families would each edit the four hand-written lists above. A kind adds item ops later only if a perf budget asks |
| Where snapping runs | in the app only, with a raw preview; in the renderer, by rules written in Rust, TS and Swift | in the renderer. A preview that does not snap lies about the result. Fixtures hold the three equal, as they do for `expr` |
| The way in without dragging | a form beside each kind; the same machine fed by keys and by named actions | the same machine. One result shape, one refusal path, and a test can demand the same action from all three ways in |
| A layout's edit | the client sends a whole new layout; it sends one edit and the crate applies and checks it | one edit. The client never judges a layout, and `check` stays the only judge |
| Live totals | aggregates and rounding added to `expr`; totals written into local state; a row's `calc` and the column totals `table` has, the rest in the answer | the last, with one new operation, `div`. Margin is a division; nice rounding and spreading a cost over groups are the app's rules |

## Decision

1. **A block names the gestures it allows.** A gesture is a field named by one of six words (`reorder`, `move`,
   `stretch`, `edit`, `draw`, `remove`), holding `{action, name, enabled}`. That is the JSON `reorder` has today,
   so `Reorder` becomes `Gesture` and nothing on the wire changes. No field, no gesture. An item with `fixed`
   takes none. `shapes.md` has the table of which kind takes which.

2. **One machine, per grabbed item**: idle, pressed, dragging, previewing, sent, confirmed, refused
   (`boundaries.md`, statechart 1). It is a pure function with no clock, written in Rust, TS and Swift and held
   equal by fixtures and a seeded corpus.

3. **A kind adds rules, not a gesture.** Its rules say which gesture a grab belongs to, the candidate result for
   a reach in the kind's own units (whole days, a cell's text, a hundredth of a picture), the next candidate for
   an arrow key, and the words for a candidate. No pixels, no time. They sit in the kind's own file in each
   language.

4. **The renderer owns only the preview.** A candidate is held outside the model. Between press and settled only
   `transform` and `opacity` change, each duration a token times `--motion`.

5. **One action goes out on release**, with the result under the gesture's `name`. Releasing on the value the
   item started with sends nothing.

6. **The app decides.** Answered: the item is drawn from the data, which the answer's ops have changed. Failed:
   the item goes back and the body's `toast` is the reason, shown and spoken. Answered with the item unchanged
   (the app opened a confirm sheet): it goes back with no reason. The app sends its change as it sends any: a
   `merge` from `diff`.

7. **Three ways in, one action out.** Keys: Space grabs, arrows step, Enter drops, Escape cancels. Named
   accessibility actions: each is one whole gesture of one step ("One day later"). Both feed the same machine
   through the same rules. Every fixture case is run once per way in and must send the same action.
   `boundaries.md` has the table per gesture, with its motion and what reduced motion does.

8. **View gestures send nothing.** Zoom, pan, page, scroll and select change only view state, which is kept by
   block id outside the view's elements, so a redraw keeps it. One pinch and wheel zoom serves `pages`, marks and
   the image viewer.

9. **A layout uses the same machine, and its result goes to a handler the host passes in.** The result is one
   `Edit`: `Move`, `Swap`, or `Show` for one size class. The app's server runs `layout::edit`, which applies it
   and runs `check` on the result, then saves the file. The shell offers only the drops `check` would pass
   (`families.md` part 6 answers each of #130's asks).

10. **`expr` gains `div`; `behave` gains one rule.** A `table`'s `calc` is a `lines`' `calc`. A gesture whose
    `enabled` does not hold joins `View.acts`, and the renderer draws no handle for it.

11. **The harness gains two steps**: `gesture` (a grab, a reach, a way in) and `refuse`. `answer` confirms.

12. **Documents and read-only kinds need no gesture.** `pages` has no gesture field. A `timeline`, a `chart` or a
    `media` with none is read-only, which is what the activity Gantt and the costing grid are today.

## Consequences

- **For apps.** `blocks::kind::Reorder` is renamed `Gesture` (the JSON is the same). A kind with a gesture needs
  an `id`. A server refuses a gesture by failing the action with a `toast`. An older client ignores a gesture
  field on a kind it knows and draws the kind read-only; it draws a new kind's fallback.
- **The first users are `list` and the image viewer.** The core slice moves `reorder` onto the machine: the HTML
  renderer draws it for the first time, and SwiftUI's gets keys, VoiceOver actions, a pending look and a refusal.
  It also moves the viewer's pinch onto the one zoom and deletes the viewer's own touch code.
- **A kind issue is new files and fields.** It writes its shapes, its rules three times, its two views and one
  fixture file. It edits no patcher, no `Child`, no driver and no machine.
- **Between the drop and the answer the item is dimmed where it was dropped.** On a slow link that can last. A
  cell that only the app can compute is dimmed for the same time. A client-built app answers at once.
- **The app's ops must be in the action's answer**, or the item goes back and then jumps when the stream brings
  them.
- **What the model does not do**: move several items in one gesture (the planner's Shift-drag), undo (the app's
  inverse action behind #135's toast), a draft of several gestures saved together, a loupe.
- **React.** The machine and the rules are in the TS core, and the driver takes an element and no framework, so
  the React adapter calls it from a ref. Each kind still needs its React view before synergy can use it: open
  question 3.
- **The static page** draws these kinds read-only.
- **Cost**: about 4,900 counted lines over seven slices (`README.md`), against 3,245 of headroom that the queued
  desktop, guard, react and form slices also need: open question 1.

## What stays an island

Nothing in the issue's list has to. `families.md` ends with the table per screen. Two things are left outside
blocks: the tower tracer's loupe, and the quotation's live HTML twin. If #140's mockups cannot place a tap as
exactly without a loupe, the tracer stays an `island` and nothing in this model changes.

## Open questions for the owner

1. **The cap.** The seven slices are about 4,900 counted lines. One raise sized for them, when the core starts?
   Recommended: yes.
2. **#139, a chart's draggable points.** The tower curve, its one worked case, is traced over a scanned picture
   and belongs to #140. No other synergy chart is edited. Park #139, and add the tower curve to #140's worked
   cases? Recommended: yes. The model keeps the row for a chart point either way.
3. **React views.** The kind issues ask for the web renderer and SwiftUI; synergy draws through the React
   adapter (#81). File one adapter issue per family when synergy's migration of that screen is queued, as R8
   does? Recommended: yes.

## Hot files

This ADR converts no file: #113's slices already do, and the kind issues are queued after #152 and #155 so that a
kind is new files. It adds no shared list, and steps around three:

| A list four kind PRs would each edit | What the model does instead |
|---|---|
| the patchers' table of child lists (`patch.rs`, `built.rs`, `patch.ts`, `Apply.swift`) | no item ops: the app's change is a `merge` of the block's list |
| a union of every kind's result, or a table of the kinds that take gestures | none: the machine is generic, and a kind's rules are in its own file |
| `tree::Step` and `web/shot/shot.ts` (196 of its 200 lines) | one `gesture` step for every kind, added once by the core slice, its runner in the new `web/shot/gesture.ts` |

Docs go in a new `docs/schema/gestures.md`, in the collected folder; the frozen `docs/schema.md` is not edited.
The cross-language rules line of `.drover/rules.md` gains `gesture` and `fixtures/gesture`.

## The `.drover/arch.toml` lines

The core slice adds these in the PR that adds the files they name.

```toml
# in `generated`
    "fixtures/gesture/sim.json",

[[layer]]
name = "gesture"
paths = ["crates/blocks/src/gesture.rs"]
mods = ["crate::gesture", "blocks::gesture"]

# `kind` becomes     may_use = ["expr", "gesture"]
# `built` becomes    may_use = ["kind", "gesture"]
# `behave` becomes   may_use = ["expr", "kind", "built", "gesture"]
# `codegen`'s may_use gains "gesture"

[[ban]]
pattern = "setPointerCapture"
paths = ["web/src/**"]
except = ["web/src/gesture.ts"]
reason = "a drag goes through gesture.ts, which runs the one gesture machine: no view writes its own"

[[ban]]
pattern = ".draggable("
paths = ["swift/Sources/BlocksUI/**"]
reason = "a drag goes through Gestured.swift, which runs the one gesture machine: no view writes its own"

[[ban]]
pattern = "DragGesture("
paths = ["swift/Sources/BlocksUI/**"]
except = ["swift/Sources/BlocksUI/Gestured.swift", "swift/Sources/BlocksUI/BlockActs.swift"]
reason = "a drag goes through Gestured.swift; BlockActs.swift's is a row's swipe, which opens its buttons"

[[ban]]
pattern = "MagnifyGesture("
paths = ["swift/Sources/BlocksUI/**"]
except = ["swift/Sources/BlocksUI/Gestured.swift"]
reason = "one pinch zoom, in Gestured.swift: pages, marks and the image viewer share it"

[[ban]]
pattern = "setTimeout"
paths = ["web/src/core/gesture.ts", "web/src/core/kind/**"]
reason = "the gesture machine and a kind's rules have no clock: the driver owns the one touch hold"
```

`frozen` and `[[collect]]` do not change. If #155 has renamed `BlockActs.swift` by then, the `except` names its
new path.
