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
| `media` | `move`, `stretch`, `remove`, `draw` | `{"body": id}`, `{"start": id}`, `{"end": id}`, `{"remove": id}`, `{"draw": {tool, at, text, group}}` | `{from, to}`, each `[x, y]` 0 to 1 of the picture | a `MarkChange`: `{id, at, to}`; `{id}` for a remove; the new mark, with no id, for a draw | Move up, down, left, right; Longer, Shorter; Delete; Add arrow, Add pin and so on |
| `timeline` | `move` | `{bar, part: "body"}` of a bar not `fixed` | `{days}` | `DaySpan` `{id, start, end}`, the same length, inside `from`..`to`, onto no fixed bar | One day earlier, later; One week earlier, later |
| `timeline` | `stretch` | `{bar, part: "start" or "end"}` | `{days}` | `DaySpan` `{id, start, end}`, at least one day | Start one day earlier, later; End one day earlier, later |
| `timeline` | `draw` | `{row}` | `{days, from}`, `from` the day pressed, else the row's first free day | `DaySpan` `{row, start, end}` over no bar | Add a bar |

A `media`'s `marks` are data the app keeps, each `{id, kind, at, to, text, tone, group, path, fixed}` with places from 0
to 1 of the picture, rounded to 4 decimals and clamped; `tools` lists what can be drawn. A draw under 2 % of the picture
gives no result; a pin or a text mark is placed by a tap, and a text mark only with its words. Keys and named actions
draw at the middle and nudge 1 %, Shift 10 %. A `fixed` mark takes no gesture and is drawn dashed. Every other mark is a
focus stop named by its group, kind, number and the ninth of the picture it is in ("Arrow 1, lower left"); a picked
two-ended mark has a grip on each end. The tool, the pick, the "into" group and a pin tracer's zoom are view state. The
static page and a `media` with no gesture field draw the marks read-only: the picture's name lists them.

A `timeline`'s days are ISO, `end` the last one drawn, and its rows are `tracks` (`TimeRow`: `id`, `title`,
`subtitle`, `bars`), since `rows` is the field every walker reads as child blocks. Its day width is view state: fit
(24 to 48 px) by default, then 48, 32, 24, 16, 8 or 4 px from its zoom buttons; on the web the pointer drags from 24 px up, the
keys and named actions at every width. The static page draws it read-only.

The harness steps: `gesture` (`id`, `grab`, `via` and `reach`: `[dx, dy]` px for `pointer`, `{dir, big}` nudges for
`keys`, step names for `action`) holds the action it sends until the next `answer` (confirms) or `refuse` (fails it).
The Swift harness runs `keys` and `action` through the rules and drops a `pointer`.

`expr` has `div`: two numbers give their quotient, anything else and a division by zero give `null`.
