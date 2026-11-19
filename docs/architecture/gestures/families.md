# The families, with synergy's screens as worked cases

For each: what the screen does today (read from synergy-apps at `a2ae461dc3`, paths under
`apps/project-management/src/` or `apps/inspection/src/`), how the model covers it, and what is left to the app or
to the kind issue's design. The cases are test cases only: no synergy name goes into blocks code.

## 1. Time axis: `timeline` (#137)

**The planner Gantt** (`components/Planner.tsx:1778`, `planner/JobRow.tsx`). One row per job, one bar per date range
of the job. A bar's body moves it and a 6 px grip on either end resizes it; both snap with `round(dx / dayPx)`
(`planner/jobRow/useBarDrag.ts:37`). A click on an empty day adds a one-day range. On release nothing is written: an
edit `{kind: "move" | "resize" | "add", …deltaDays}` (`packages/domain/src/plannerScheduleEdit.ts:50`) is planned, a
sheet shows what it would do (crew ticks lost, days blocked by timesheet hours), and Save writes it in one RPC. The
grips have no keys; the same edit can be typed in a date form.

| Today | In the model |
|---|---|
| move, resize, add | `move`, `stretch`, `draw`, each giving a `Span` under one action |
| snap to days | a reach is whole days; `candidate` keeps the length on a move and at least one day on a stretch |
| the plan and its sheet | the app's handler: it refuses (a blocked day), answers with ops, or opens its confirm sheet, whose Save is a plain button. The bar goes back to the data while the sheet is open, as it does today |
| finished jobs cannot be edited | `fixed` on their bars; `enabled` on the gesture for the capability |
| no keys on the grips | the keys and named actions of `boundaries.md` |
| zoom from 2 to 40 px a day, T for today, a week per arrow | view gestures; the day width is a view value. A bar can be grabbed only while a day is wide enough to hit, a width #137's design sets |
| weekends and Thai holidays shaded | `off`: the days the app lists |

Left to the app: Shift-drag, which moves every range of a job at once (its date form does that), the activity picker a
day cell opens (a bar's `tap`), and merging ranges that touch (its handler). Left to #137's design: nested rows,
segments drawn inside a bar, the week, month and quarter headers of a small day width.

**The activity Gantt** (`features/estimate/components/ActivityBreakdownTab.tsx:1179`). Its bars take no gesture
today: start day and duration are number inputs in a list under it (`:1530`, `:1560`), saved 1.5 s after the last
key. It is a `timeline` with no gesture field and a `lines` block under it. If the app declares `move` and
`stretch` it gets the drag too, and the inputs stay as one more way in. Its collapsed gaps ("⋯ 12 days") are not
covered: the app shows the days, shaded by `off`.

## 2. Grid: `table` with `edit`, `reorder` and `calc` (#138)

**Product mark-up** (`components/ProductPanel.tsx`). The one real grid: about twenty columns, half typed into and
half computed; group, item and total rows; a drag handle that moves an item, or a group with its items
(`:1057`). Every key writes the whole row list to local state and the whole document is saved 1.5 s later.

| Today | In the model |
|---|---|
| a cell edit | `edit`, sent when the cell is left (Enter, Tab, blur), as one `CellEdit` |
| row drag | `reorder`: every row id in the new order, so a group moved with its items is one result |
| the chain in `packages/domain/src/calc.ts:504`: total = qty × price, net = total × mult, CIF = net + freight, in baht = CIF × rate, tax = that × % if taxable, cost = the sum, price = cost / (1 − margin), unit price = price / qty | `calc`, live, with `pick` for the ifs and the new `div` for the divisions. The rate is a hidden cell the app fills |
| nice rounding (`calc.ts:235`), trucks = ceil(volume / capacity), transport spread over the groups by weight | the app's. Those cells have no `calc`: they are drawn dimmed from the send until the answer |
| the whole document saved, a soft lock, an out-of-date check | the app's handler; a stale copy is a refusal with its reason |

Left to the app: rich text in a description cell (a sheet with form v2's rich text), the named options of a whole
grid (chips and a new screen), Excel export (the table's `export`). Left to #138's design: group and subtotal
rows, and whether a column's width can be dragged (a view gesture if so).

**The costing grid** (`components/project/ServiceProductSections.tsx:463`) mounts the same panel read-only, one
row per group. It is a `table` as #80 built it. Nothing is needed.

**The service workspace** (`components/Workspace.tsx`, `workspace/`). Not a grid: each row is a card of labelled
inputs in a section (manpower, transport, equipment, materials, other), with a pricing chain under them. Each section
is a `lines` block (#133), whose `calc` already covers a row's total, with `pick` for its clamps. The pricing chain
(overhead, tax withheld, margin, the rounded final price) is the app's answer to the `lines` action that already
exists. Its side-by-side columns of other projects are sections of read-only blocks, and its AI draft lines are a
`choice` whose action adds rows.

## 3. Plot: a `chart` point (#139), and where the tower curve goes

**The tower design curve** (`components/designCurve/Tracer.tsx`, `ChartSvg.tsx`) is not a chart with points to
drag. The engineer uploads a scan of the maker's chart, taps two grid crossings and types their values to
calibrate it, then taps along each printed curve. Taps are kept in the image's pixels (`Tracer.tsx:219`). A
least-squares curve is fitted through them on every pointer move (`ChartSvg.tsx:272`), a table of values is
filled from the fits, and a typed cell overrides its fit. A tap can be nudged by the arrow keys; adding one
needs a pointer.

So it is marks on an image, a grid and a form:

| Today | In the model |
|---|---|
| the scan, and taps on it, one line of taps per range | `media` with `pin` marks, one `group` per line; `draw`, `move`, `remove` |
| the two calibration taps and their four numbers | two `pin` marks in their own group, and a `form` |
| the fitted curves | `line` marks the app sends back, `fixed`, with a `path`; drawn dimmed while a tap is out |
| the table of values with typed overrides | a `table` with `edit` |
| zoom from 1 to 3 by buttons | the `zoomed` view gesture |
| the guided steps | `steps` and `text`, by the app |

What does not come over is the loupe, which magnifies under the finger while a tap is dragged, and the fit
redrawn while dragging (it is redrawn when the answer lands). #140's design decides between a loupe and
zoom-then-place.

**A chart point.** `move` on #132's `chart`: x is the chart's label and stays, y moves by the series' `step`,
and the result is a `PointMove`. No synergy screen needs it: its other charts are read-only. Open question 2 in
`adr.md`.

## 4. Marks on an image: `media` with marks (#140)

**Photo markup** (`components/CustomPhotoMarkup.tsx`). Six tools: arrow, box, ellipse, text, numbered point,
highlight. A mark is `{t, x1, y1, x2, y2, label?}` from 0 to 1 of the photo (`lib/reportPack/customReport.ts:84`), one
red, widths relative to the photo. A drag draws; a drag under 2 % of the photo is dropped
(`CustomPhotoMarkup.tsx:328`); a tap with the text tool opens an input. The marks are saved as JSON with the report
and the photo is never changed. Drawing needs a pointer, and the marks are hidden from a screen reader.

| Today | In the model |
|---|---|
| the six tools | `tools`, and a `Mark` of that `kind` |
| draw | `draw`: the new mark with no id. The app answers with the mark, its id and, for a point, its number |
| select and delete | a tap selects (view state); `remove` |
| no move, no resize | `move` and `stretch`, if the app declares them |
| undo of the last mark | the app's: a `remove` behind #135's toast |
| pointer only, hidden from a screen reader | each mark is an element named by its kind and the ninth of the photo it is in ("Arrow 3, upper left"), with the keys and named actions of `boundaries.md` |
| the marks are data | the same: the app keeps `marks`, and its PDF draws them |

## 5. Documents: `pages` (#141)

**The report preview** (`components/CustomReportPreview.tsx`) and **the quotation preview**
(`components/quotation/QuotationPreviewPane.tsx`, `pdfPreview/PdfCanvasPreview.tsx`). Both build the PDF in the
browser and raster it with pdfjs: a column of page pictures, the quotation's named "Page n of N", the report's
at most 60. No text selection, no links, nothing to tap on a page. A download button, and for the quotation an
"out of date" line with Refresh (`exactPdf/ExactPdfViewer.tsx:143`).

| Today | In the model |
|---|---|
| the pages | `pages`: each a picture with its size and its `alt` |
| building, failed, out of date | `note`, and plain `button`s beside the block for Refresh and Sign off |
| download | `file`, a link to the PDF: it is also what a screen reader's user opens |
| zoom, paging | view gestures: nothing is sent |

Who makes the pictures is the app's choice: a server, or in a client-built app its own code, which may keep its
PDF library. blocks draws pictures and has none. The quotation's second surface, live HTML with text that can be
selected, is not a picture: the app builds it from `prose` and `table`, or keeps it.

## 6. Layout: drag to rearrange and swap (#130)

Each ask of #130, answered:

| #130 asks | Answer |
|---|---|
| the edit-mode states | statechart 2 in `boundaries.md` |
| a new whole layout, or ops on it | one `Edit` per gesture: `Move`, `Swap` or `Show` (`shapes.md` part 5). A whole layout would make the client the judge of it |
| how an app saves it | the host's `save` gets the `Edit`; its server runs `layout::edit(current, &edit, &CONTRACT)`, writes the file and hands the shell the new layout. blocks writes nothing |
| how protected screens refuse a drop | a locked screen is in no layout (`check` refuses a file that places one), so it is never a node to grab, and no edit can replace or hide it: an edit only moves, swaps or re-places nodes that are there. `edit` runs `check` on its result, and `drops` offers no place `check` would refuse |
| a keyboard and VoiceOver path | the arrows walk `drops` in reading order; the named actions of `boundaries.md` |
| per-size-class edits | the tree is one for both sizes, so a `Move` or `Swap` changes both. How a node shows is per size: `Show` names the size class on screen |
| the web shell and SwiftUI, with fixtures | `Mount.edit` and `.layoutEditing`; `fixtures/layouts/edits.json` |
| every result passes `check`; a refused drop changes nothing | `edit` returns a checked layout or the layout's refusal; the shell draws the old layout until `save` confirms |

## What is left an island

| Screen or part | After the families | Left outside blocks |
|---|---|---|
| planner | `timeline` | nothing that needs an island |
| project detail: costing grid, activity Gantt, quotation | `table`, `timeline` with `lines`, `pages` | the live HTML quotation, if the app keeps it |
| product mark-up | `table` with `edit`, `reorder`, `calc` | nothing; rich text moves to a sheet |
| service workspace | `lines` per section | dragging the panel widths and the canvas |
| tower design curve | `media` with marks, `table`, `form`, `steps` | the loupe. If #140's mockups cannot place a tap as exactly without it, the tracer stays an `island` and nothing in this model changes |
| photo markup | `media` with marks | nothing |
| report and quotation previews | `pages` | making the pictures |
| pack drawing (`components/PackDrawingSvg.tsx`) | `media`: it takes no gesture, and the app can make it a picture | its millimetre geometry |
| card face (cards app) | not a gesture; not part of this issue | stays an `island` |
