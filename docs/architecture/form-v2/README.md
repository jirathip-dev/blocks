# form v2: typed field types (#131)

## Summary

Decision: each field type gets its own typed shape, as each block kind has. New: search, slider, upload, signature,
date, days, hours, combo, tags; multi-line and rich are options of text. The renderer does what is the same for every
app (calendar, filter, hours, labels); the app answers a search or a long list with a new screen. Files and signature
PNGs go to a file handler the app passes in and travel as ids. Language, era and today are set once on the screen.
Slices: ten, about 3,200 counted lines: the fields folder, then search, slider, upload, signature, date, hours, combo, multi-line, rich.
Decided (q2301): (1) one cap raise; (2) hours takes a break off, as synergy does; (3) table (#80) reads the screen's era.

## Read in this order

| File | What |
|---|---|
| `usage.md` | how the callers read: one synergy route per field, the file handler, a Rust server, the route's test |
| `adr.md` | the question, what exists, the options, the decision in ten parts, consequences, the three open questions, hot files, the `.drover/arch.toml` lines |
| `shapes.md` | the folders, the field union, the three views of a value, locale, the file handler, the field view, the drawn tree |
| `boundaries.md` | which module may call which, the contract every renderer's field meets, how a value leaves, three statecharts |

## The eight needs at a glance

| Need | Type | Runs in the renderer | The app's part |
|---|---|---|---|
| search | `search` | typing, clear, hiding the rows of a list or table | results as a new screen; the URL |
| slider | `slider` | the live label | what the number does |
| file and photo upload | `upload` | pick, type and size check, thumbnails, remove, progress | takes the bytes in its file handler, answers an id |
| signature | `signature` | draw, clear, empty or signed | takes the PNG the same way |
| date | `date`, `days` (a range) | the month calendar, min and max, the Buddhist Era | says what today is |
| time range | `hours` | half-hour steps, hours worked, the over-8 flag | finer rules (holidays) |
| combo box | `combo`, `tags` (many) | filtering its options, free text | the options, when it loads them as you type |
| multi-line text | `text` with `rows`, `grow`, `max`, `rich` | growing, the counter, bold, italic and bullets | |

## The slices, in order

Counted lines are non-test, non-generated lines under `ci/cap.toml`: 16,464 of 19,000 today, 2,492 left after the
open PRs (`drover cap blocks`), and those were sized for the guard and React slices. The ten slices need about
3,200 more: open question 1. A slice with a design stage is queued `--design`, and its mockups are drawn on the
default look at 390 and 1440, light and dark.

| | Slice | Builds | Design stage draws | Counted | After |
|---|---|---|---|---|---|
| F0 | this issue's PR | this folder | | 0 | |
| F1 | fields become a folder | the `Field` union and `field!`; the four old types moved to one file per renderer and to the field contract; the generated tables; `locale` on screen and sheet and the words table; `lit`; the tree's `fields`; `fixtures/fields/`; the patcher keeps the focus; `docs/fields.md` | nothing: no picture changes | +260 | #124, and #81's R2 (`codegen.rs` is at 908 of its 1,000 lines, and R2 makes it a folder) |
| F2 | search | the type; the live rule in the HTML `form`; the typing sender; `filters` and its match rule; the `aim` fault; a fixture of hub's grouped results | the box, clear, working, "3 of 12", no match, grouped results | +280 | F1, R7 |
| F3 | slider | the type in every renderer; the `slide` step | the track, the label, off | +130 | F1, R7 |
| F4 | upload | the type; the file handler in every host; the type and size check; the `file` step; the bans. F4a: crate, static page, HTML, React. F4b: SwiftUI | empty, thumbnails, progress, failed, refused, one or many, the camera on a phone | +520 (390, 130) | F1 |
| F5 | signature | the type; the pad, the PNG, the hand-over when the form is sent; the `draw` step | empty, signed, off, on a phone and wide | +330 | F4a |
| F6 | date and days | both types; `day()` and the month names in three languages (reused if #80 built them); the calendar. F6a and F6b as in F4 | the month calendar on a phone and as a popover, a range, Thai and English in both eras, min and max, today | +560 (440, 120) | F1 |
| F7 | hours | the type; the worked hours in `lit` | the two times, "8 h", "10 h · over 8", empty | +255 | F1 |
| F8 | combo and tags | both types; the list they share; `load` on the typing sender. F8a and F8b as in F4 | closed, open, a second line, no match, free text, loading, tags | +485 (365, 120) | F2 |
| F9 | multi-line text | `rows`, `grow`, `max` and the counter | two rows, grown, at the limit | +110 | F1 |
| F10 | rich text | the three marks in three languages; the toolbar | the toolbar, each mark, the saved text drawn by a `text` block | +260 | F9 |

Search and slider come first: hub can migrate after F3. Upload and signature are next: delivery's proof screen
needs them (and the line-item editor and stepper, which are their own issues). F6 to F10 can run side by side.
Between an "a" and a "b" slice SwiftUI draws the field as a text input, and `fixtures/trees/swift/` records it.

## Where each ask of the issue is answered

| The issue asks | Where |
|---|---|
| the shapes | `shapes.md`; `adr.md` parts 1 to 3 |
| which fields are local and which need an app action | `adr.md` part 4; `boundaries.md`, How a value leaves |
| how files and PNGs leave without the wire | `adr.md` part 6; `shapes.md`, The file handler; `boundaries.md` statecharts 2 and 3 |
| the language and era inputs | `adr.md` part 7; `shapes.md`, Locale |
| every renderer draws them | `boundaries.md`, The field contract; `adr.md` part 8 |
| a synergy route per field | `usage.md` parts 1 to 8 |
| the slices, their budgets and design stages | above |

## What was read

- blocks `staging` at `a07d312`: `kind/`, `behave.rs`, `built.rs`, `wire.rs`, `site/views.rs`, `web/src/render/`,
  `behave.ts`, `patch.ts`, `BlockFields.swift`, `docs/schema.md`, and the ADRs of #81 and #113 (proposed).
- #80's design and its amendments (q2273 to q2275) on branch `issue-80`; #124's diff.
- synergy-apps `staging` at `a2ae461dc3`: `docs/blocks-migration/inventory.md`, and the screens it names for
  search, slider, upload, signature, date, time range and combo.

Nothing here was built or run: the line counts are estimates from the size of today's field code in each renderer.
