# Gestures

The model is `docs/architecture/gestures/`; this is what is built. A block names the gestures it allows: a field
named by a word (`reorder`, `move`, `stretch`, `edit`, `draw`, `remove`) holding a `Gesture`, `{action, name,
enabled}`. No field, no gesture. A block with one needs an `id` (`Built::check`'s `Unnamed`); two gestures of one
block may send the same action. A gesture whose `enabled` does not hold puts its action in `View.acts`, and its handle
is disabled.

The renderer owns only the gesture in progress. One machine per grabbed item (`gesture::step`, `core/gesture.ts`,
Swift's `step`: idle, pressed, dragging, previewing, sent, confirmed, refused) is held equal by
`fixtures/gesture/machine.json` and the generated `fixtures/gesture/sim.json`. A kind adds rules (`gesture::Rules`:
the word of a grab, its start, the candidate for a reach, a nudge, the named steps and the words), in its own file in
each language, held equal by `fixtures/gesture/<kind>.json`.

On release one action goes out, its result under the gesture's `name`; a release on the start sends nothing. A
server reads it with `Action::read`. Answered, the item is drawn from the data the answer's ops changed; failed, it
goes back and the toast says why. Until then the candidate is held outside the model (the web `Ctx.held`, SwiftUI's
view state), so a redraw draws the item where it was dropped.

Three ways in send the same action: a pointer (a body after a 300 ms hold in SwiftUI; a handle at once), the keys
(Space grabs, arrows nudge, Shift a big one, Enter drops, Escape cancels) and named accessibility actions, each one
whole gesture of one nudge. Between press and settled only transform and opacity change, over `--enter` times
`--motion`; reduced motion jumps. `zoomed` (web) and `Zoomed` (SwiftUI) are the one pinch, Ctrl and wheel, double
tap and key zoom; the image viewer uses it.

| Kind | Word | Grab | Reach | Result | Named steps |
|---|---|---|---|---|---|
| `list` | `reorder` | a row id whose `handle` is true | places | every child id in the new order | Move up, Move down, Move to top, Move to bottom |
| `table` | `reorder` | a row id not `fixed`; a `group` row takes its items | rows | every row id in the new order; an item stays below the first group row, a group moves between groups | Move up, Move down, Move to top, Move to bottom |
| `table` | `edit` | `{row, column}`: a column with `edit`, not in `calc`, of text, number, money or date; not a group or `fixed` row | the typed text | a `CellEdit` `{row, column, value}`; a text the column can't take gives none | none: each cell is a text field |
| `timeline` | `move` | `{bar, part: "body"}` of a bar not `fixed` | `{days}` | `DaySpan` `{id, start, end}`, the same length, inside `from`..`to`, onto no fixed bar | One day earlier, later; One week earlier, later |
| `timeline` | `stretch` | `{bar, part: "start" or "end"}` | `{days}` | `DaySpan` `{id, start, end}`, at least one day | Start one day earlier, later; End one day earlier, later |
| `timeline` | `draw` | `{row}` | `{days, from}`, `from` the day pressed, else the row's first free day | `DaySpan` `{row, start, end}` over no bar | Add a bar |

A `timeline`'s days are ISO, `end` the last one drawn, and its rows are `tracks` (`TimeRow`: `id`, `title`,
`subtitle`, `bars`), since `rows` is the field every walker reads as child blocks. Its day width is view state: fit
(24 to 48 px) by default, then 48, 32, 24, 16, 8 or 4 px from its zoom buttons; on the web the pointer drags from 24 px up, the
keys and named actions at every width. The static page draws it read-only.

A `table`'s `calc` maps a column to an `Expr` over its row's cells, worked out in column order (so one may read an
earlier one) as the user types, before anything is sent; group rows (`group: true`) head the items under them, carry
their subtotals, and sort and filter with them; totals and the row count count items only. `fixtures/gesture/table.json`
holds the rules equal in Rust, TS and Swift. On a phone a row opens a sheet whose fields each send their own edit.

The harness steps: `gesture` (`id`, `grab`, `via` and `reach`: the typed `[text]` for a cell, `[dx, dy]` px for `pointer`, `{dir, big}` nudges for
`keys`, step names for `action`) holds the action it sends until the next `answer` (confirms) or `refuse` (fails it).
The Swift harness runs `keys` and `action` through the rules and drops a `pointer`.

`expr` has `div`: two numbers give their quotient, anything else and a division by zero give `null`.
