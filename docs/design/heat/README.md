## Summary

Decision: a new core kind, heat: a table of square cells under a title, one row label per row and one column label per column, each cell coloured by its value on five steps of one theme tone (light tint to strong) with a legend that shows the steps, the numbers at their edges and the unit. An empty cell is hatched in the line colour, never a ramp colour, and the legend then adds "No data". A cell may carry a short label; a cell may be tapped, which picks it and sends the block's action with its row and column. The row under the title reads the picked cell (else the highest one), so a phone needs no tooltip. Many columns scroll sideways with the row labels fixed.
Screens: a training page with three heat maps (load by day and week, ride times, a single row of sleep scores), and a sheet of every state (tap, hover and focus, sparse, fixed scale, labels, 31 columns, Thai, empty). Each light and dark, at 1440 and 390.
Open questions: (1) Five fixed steps, as drawn, or a smooth ramp? Steps read better and match the legend exactly. (2) In dark mode the strongest step is the lightest; keep "most value, most contrast" in both modes?

## Images

| Image | What it shows |
|---|---|
| `heat-light-1440.png`, `heat-dark-1440.png` | **Training load**: 12 weeks × 7 days in the `warn` tone, unit TSS. Mondays are "Rest": a label with no value, so hatched. Week 7 Wed has no data (hatched, "–"). Week 8 Sat is picked: ink ring, and the row under the title reads "Week 8 · Sat 139 TSS". **When you ride**: a sparse grid in `info`, legend with only its end numbers. **Sleep score**: a single row with a fixed scale 50–100 and the value as each cell's label |
| `heat-light-390.png`, `heat-dark-390.png` | The same page on a phone: row labels narrow to 56px, cells keep at least the control size, long cell labels cut with an ellipsis, the "No data" key wraps under the ramp |
| `states-light-*.png`, `states-dark-*.png` | 1 a tapped cell and the action it sends (`row`, `column`). 2 hover (1px ink edge) and keyboard focus (focus ring); the readout follows. 3 a sparse grid. 4 a fixed min and max: values beyond them take the end step and the legend reads ≤60 and ≥90. 5 labels on every cell, `ok` tone. 6 31 columns: the grid scrolls sideways on a phone, the row labels stay put. 7 a Thai screen, a long row name cut. 8 no values at all: the block's empty text, no grid |

## The decisions

- **Shape**: `columns` (labels), `rows` (each a `name` and one cell per column), a cell is empty or has a `value` and an optional `label`. `scale` has optional `min`, `max` and a `unit`. Optional `tone`, `selected` (row and column), `tap` (an action), `empty` (text), and `edges: ends` to show only the two end numbers.
- **Colour**: tokens only. The ramp is the block's tone (`--k`, default `info`) mixed into `--card` at 18, 38 and 58%, then the tone itself, then the tone mixed with `--fg`. So it follows light and dark by itself. Text on the two strongest steps is `--card`, on the rest `--fg`. Empty cells: a `--line` hatch and edge. Tones: `ok`, `warn`, `bad`, `info`, `accent`.
- **Scale**: with no `min`, it starts at 0 (or the lowest value if negative); with no `max`, it rounds the highest value up to a round number. Values outside a given min or max take the end step.
- **Cells**: at least `--ctl` wide and `--hit` tall, gaps of `--seam`, square corners. The label is drawn when set; a bare value is not written in the cell (the readout and the screen-reader text carry it).
- **Tap**: each cell is a button; one is in the tab order and arrow keys move between cells. Tapping picks the cell and sends the action with `row` and `column`. Hover moves the readout on the web.
- **Access**: the block is a figure named by its title; each cell is read "row, column: value unit, label", an empty one "no data".
- **Phone**: the kind reads its own width (container query), not the page's; nothing is measured in script.

## Files

`heat.html` and `states.html` are the pages; `heat.js` and `heat.css` are a preview-only port of the proposed renderer; `page.css` is the host page; `render.sh` draws every PNG with the cached headless Chromium.
