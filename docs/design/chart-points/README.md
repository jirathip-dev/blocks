## Summary

Decision: on #132's chart, a block with `move` lets each point of a line, bar or combo series be dragged up or down in the series' steps. Its x never moves. Release sends one action with the series, the x and the new value; the app then confirms or refuses. Each editable point shows a hollow handle. While grabbed, the legend reads the new value and how far it moved, and a tag on the y axis reads it where a finger hides the point. Keys and screen-reader Raise/Lower send the same action. A chart with no `move`, a locked one, or a `fixed` series takes no gestures.
Screens: a sales plan (a pointer drag, a keyboard drag and a read-only chart), and a sheet of every phase and way in. Each light and dark, at 1440 and 390.
Open questions: (1) Bars are draggable too, like line points (headcount plan). Keep that, or only line points? (2) On a phone a 12-month handle is about 24px wide, under #136's 44px `--hit` (it is still 44px tall). Accept it, or allow at most 6 editable points on a narrow card? (3) The axis stops a drag at its top, so going higher takes a second drag after the app answers. OK?

## Images

| Image | What it shows |
|---|---|
| `plan-light-1440.png`, `plan-dark-1440.png`, `plan-*-390.png` | **Revenue plan** (combo): Actual bars are `fixed`, so they have no handles. Every Target point has a hollow handle. May's handle is mid pointer-drag: filled and lifted, with a dashed ghost and line where it started. The y-axis tag reads ฿1.35M and the legend reads "Target ฿1.35M +฿150K from ฿1.20M". The axis holds still. **Headcount plan** (bar, step 1): June grabbed by keys and moved up two steps (47 → 49), with the focus ring and the keys shown under the plot. **Gross margin**: no `move`, so no handles and no gestures (the AC's read-only case) |
| `states-light-1440.png`, `states-dark-1440.png`, `states-*-390.png` | 1 idle and the focus stop, with what VoiceOver and the web read. 2 pressed. 3 previewing, stopped at the axis top. 4 back on the start value, so nothing is sent. 5 sent: dimmed, ↻ in the legend. 6 confirmed: drawn from the app's data, which the app may have changed further. 7 refused: back to the start value, and the toast gives the reason. 8 the screen reader's Raise/Lower actions. 9 the hit areas, and which point wins where they overlap. 10 locked (`enabled` false): read-only. 11 the three ways in, the one action, step precision, reduced motion |

## The decisions (all within #136's ADR: `move`, `PointMove`, statechart 1, the chart row of `boundaries.md`)

- **Wire**: what `shapes.md` already gives. The chart gets `move: {action, name, enabled}`, and a series gets `step` and `fixed`. The action's values are `{<name>: {series, at, y}}`. `at` is the point's x as the block wrote it. `y` is a whole number of steps.
- **Which charts take it**: `line`, `bar` and `combo`. A `stacked` or `donut` chart with `move` fails the block check, because a segment has no y of its own. A null value has no point, and adding a point is out of scope (that would be `draw`).
- **Step**: the series' `step`. Without one, the step is what the format shows: ฿100K for `thb_m`, 0.1 for `percent`, 1 for `count` and `thb`. While a point is grabbed, values read at the step's precision (฿1.35M, not #132's ฿1.4M).
- **Range**: during a drag the axis stays as it was at the press, and a candidate is clamped between zero and the axis top. Because every reach gives a candidate, a chart point never enters the `dragging` (no-drop) phase. The axis may grow after the answer.
- **Marks**: a hollow 8px square in the series colour on every editable point. Pressed or previewing: filled, scaled 1.5, with a card ring (only transform and opacity animate). The start value is a dashed ghost with a dashed line to the candidate. Sent: 50% opacity, `aria-busy`. No floating tooltip: the legend is the readout, as in #132, and a tag on the y axis gives the candidate.
- **Hit area**: each handle is its column wide and `--hit` tall, centred on the point, with `touch-action: none`. Where handles overlap, the nearest point wins. A press elsewhere in the column is #132's tap. So is a press on a point released without moving, which is statechart 1's tap.
- **Keys**: one Tab stop per editable series. Left and Right walk its points (that is focus, not a gesture). Space grabs. Up and Down move one step, Shift ten. Enter drops, Escape cancels. The keys show under the plot while a point is grabbed by keys.
- **Screen reader**: the point is named "Series, Month Year: value", with role description "editable point". It has the named actions Raise and Lower, each one whole gesture of one step. The phases are spoken as #136 lists them: grabbed, the candidate, sending, the answer, "not changed" plus the reason.
- **Answer**: as in #136. Confirmed: the point is drawn from the data, over `--settle`. Refused: it goes back to its start, and the toast gives the reason. Confirmed but unchanged: it goes back with no reason. Reduced motion: the point still follows the finger, and everything else happens at once.
- **Static page**: read-only, with no handles.

## Files

`plan.html` and `states.html` are the pages. `points.js` is a preview-only overlay on #132's `../chart/chart.js`, not product code. `points.css` holds what impl adds to `web/src/css/kind/chart.css` (tokens only). The pages load `web/dist/blocks.css` and `../neutral-default/tokens.css`. Images: `./render.sh` (Playwright's cached headless Chromium, reduced motion).
