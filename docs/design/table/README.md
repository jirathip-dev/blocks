## Summary

Decision: `table` is one tile on blocks' default look. On a wide screen it is a real grid: a bar with the title, the row count and one filter box; grey headers you tap to sort (↑, ↓, then back to the order as sent); numbers right-aligned; tone cells as square coloured tags; a bold totals row that follows the filter. Under 600px wide the same table becomes phone rows: name, tag and main figure on top, the other cells on a grey line below, with a sort picker beside the filter box. The static site prints the same table without the controls.
Screens: an invoices page, and a sheet of every state (column kinds, sort, filter, no match, empty, wide, row diff, phone rows, static page, fallback). Each is drawn light and dark, at 1440 and 390.
Open questions: (1) Filtering is one search box only. Per-column filters (pick values, number range, date range) as in synergy's `FilterMenu`: now, or a follow-up? (2) Phone rows are stacked rows, as the issue says, not synergy's `PhoneTable` dense grid with a pinned key column and sideways stepping. Is that right? (3) Totals use the aggregate the app names (sum, avg or count). Tapping a total to cycle sum → avg → count is left out. OK?

## Images

| Image | What it shows |
|---|---|
| `table-light-1440.png`, `table-dark-1440.png` | A billing screen: header tile, three figure tiles, then the `Invoices` table: 12 rows, sorted by Due ↑ (the Due header in ink with its arrow), Status as tags (paid, overdue, disputed, sent, draft), drafts with blank dates sorted last, Hours and Amount (unit ฿ after its header) right-aligned, and the totals row. INV-0139 just changed from sent to paid, so it carries the 3px ink edge |
| `table-light-390.png`, `table-dark-390.png` | The same block on a phone: the bar holds the filter box and `sort: due ↑`. Each row has the client (`phone: title`), its status tag, the amount (the last number column with a total) and ›. Below that a grey line reads "Invoice … · Due … · Hours …". Issued is `phone: hide`. Totals are the last row, with Hours on its grey line |
| `states-light-1440.png`, `states-dark-1440.png`, and the `-390` pair | 1 column kinds and alignment, blank cells, and the three aggregates (sum with no word, `avg` to 1 decimal, `count` of non-blank cells); a `sort: false` column has a plain header. 2 the three sort states, with blanks last both ways. 3 the filter "orchard": "2 of 12 rows", and the totals follow it. 4 no match, with [clear]. 5 empty: the block's `empty` line, no controls. 6 a wide table scrolls sideways with the first column held in place; on a phone the hidden months drop out. 7 row diff: one row patched and one added (ink edge), one removed. 8 phone rows (at 1440 in 390-wide boxes). 9 the static page with JS off. 10 the fallback row |

## Decisions

- **Shape.** `columns`: `id`, `label`, `kind` (`text`, `number`, `date` or `tone`), plus the optional `align` (`start` or `end`; the default is end for numbers, start for the rest), `unit`, `digits`, `total` (`sum`, `avg` or `count`), `sort: false` and `phone` (`title`, `tag`, `value`, `meta` or `hide`). `rows`: `id`, `cells` keyed by column id, and an optional `tap`. On the table: `title`, `sort` (`{by, dir}`, the starting order), `filter: false` to drop the box, and `empty`. A tone cell is the existing `Label` (`text`, `tone`) and is drawn as the existing `.tag`.
- **Formatting is fixed, not locale-driven,** so every renderer and `blocks-shot` agree. Numbers use en-US grouping and at most 2 decimals (or `digits`). A date is an ISO `YYYY-MM-DD` drawn as "19 Nov 2026". Nothing reads a clock. A blank cell (`null` or missing) draws nothing.
- **Sort:** one column at a time, stable. Tapping a header goes ↑, then ↓, then back to the block's own order. Blank cells go last in both directions. Text sorts case-insensitively, a tone column by its text, a date by its ISO value. The header gets `aria-sort`.
- **Filter:** one box. Every word must appear in some cell's drawn text, case-insensitive. The count reads "N of M rows", and the totals cover only the rows shown. When nothing matches, it says "No rows match “x”" with a [clear] button.
- **State is the renderer's.** The sort and the filter text are local to the screen and kept per block id across updates, like `diagram`'s "was N". The app is never sent them.
- **Row diff:** rows are keyed by `id`, so a patch updates, adds or removes one row without redrawing the table. A changed or new row gets the 3px ink edge (as `diagram` does) until the next update, and a new row fades in through `b-late`.
- **Phone:** there is one DOM, a real `<table>` (with a hidden caption). A container query (`.tbl` is the container, under 600px) hides the head and lays each `tr` out as a row: title, tag, value, ›, then a meta line of `label value` pairs. If `phone` is not set, the first text column is the title, the first tone column is the tag, the last number column with a total (else the last number column) is the value, and everything else is meta. No JS measuring, so the static page gets it too.
- **Static site writer:** the same `<table>`, in `sort` order with the totals worked out, and no box, select or header buttons.
- **Fallback** (a renderer without `table`): one row with the title, the first summed column's total, and "N rows".
- **SwiftUI:** a `Grid` when the width is 600 or more, else the same phone rows (a `List` of the row anatomy), with the same formatting, sort and filter rules.

## What impl builds

- The kind in the crate (`Table`, `Column`, `TableRow`, with `Label` reused for tone cells), then `just gen` for the schema, TS and Swift, and `fixtures/blocks/table.json` (the invoices here, trimmed).
- `web/src/render/table.ts` draws the DOM above; there is no `gap(` for `table`. `table.css` here, about 45 rules using only tokens, goes into `web/src/blocks.css`, and `.tbl` joins the tile rule.
- The site writer's element, the fallback, and keyed row ops in diff/patch. `blocks-shot --check` at 1440 and 390, and a SwiftUI render test.
- `table.js` and `data.js` in this folder are a preview-only port that draws these images; they are not product code. Images: `./render.sh` (Playwright's cached headless Chromium, light and dark, reduced motion).
