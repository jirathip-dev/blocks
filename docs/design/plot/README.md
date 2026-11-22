## Summary

Decision: a plot looks like `chart` (same card, legend, 2px lines, square marks, tokens only). The legend is the readout: each line's latest value, then the target's range, then the peak's label. The target is a pale moss-green band with thin edges. The peak is a thin dashed ink line, labelled in the legend so it never covers the live line. A small square marks each line's newest point. A live plot fills from the left, then scrolls with the newest point on the right edge.
Screens: a live hang session (a set with a target, a peak and two lines, plus a whole-session heart rate plot), and a sheet of every state. Each is drawn light and dark, at 1440 and 390.
Open questions: (1) The peak's label sits in the legend, not on its line. A label on the line covers the newest point at the right edge on a live plot. Is that right? (2) No table of the numbers, unlike `chart`: at thousands of points the legend's latest values are the text. Is that enough?

## Images

| Image | What it shows |
|---|---|
| `plot-light-1440.png`, `plot-dark-1440.png` | The issue's plot: "Set 3" of a repeaters session, x fixed 0:00–0:30 on a time axis, y fixed 0–40 kg. Two lines: Force (ink, live, 21 s in) and Set 2 (teal, complete). A target band 25–30 kg, and the peak line with "Peak 31.4 kg" in the legend. Below it is a whole-session heart rate plot: no window, the y range follows the points, a "Max 167 bpm" line. Stat tiles above show how the plot sits among tiles |
| `plot-light-390.png`, `plot-dark-390.png` | The same at phone width. The legend wraps, the plot drops from 200px to 150px tall, and every other x label is hidden; grid lines stay |
| `states-light-*.png`, `states-dark-*.png` | 1 live in a 10 s window at 0:04, 0:10 and 0:17: fills from the left, then scrolls; the point before the window is kept so the line meets the left edge. 2 static on a time axis, one line. 3 static on a plain number axis with a unit (Edge, mm). 4 past an hour, every tick reads `h:mm:ss`. 5 the peak near the top edge. 6 the peak inside the target. 7 a long title and long line names wrap, three lines in the default colour order. 8 empty: the grid at its range and the `empty` text. 9 the fallback row an older client draws |

## The decisions

- **Colours**: as `chart`. A line with a tone takes its token. One with no tone takes ink, teal, ochre, purple, moss green, in that fixed order, so colour follows the line, never its rank. The dataviz palette check passes ink beside teal (ΔE 26, light and dark). It fails ink beside `mute` grey in light (ΔE 12, under 15), so the samples compare two lines in ink and teal, not grey. Text never takes a line's colour.
- **Marks**: lines 2px, square caps, drawn with non-scaling strokes on one stretched `svg` clipped to the plot area. Grid lines `--line`, the bottom line `--edge`, x grid lines at each x tick. An 8px square with a 2px card-colour ring sits on each line's last point, which is the value the legend shows. Points are never drawn one by one.
- **Target**: a band from `min` to `max`, filled with `--g` at 14% and edged by 1px of `--g`. It is drawn under the lines. The legend shows it as "Target 25–30 kg" with a band key.
- **Peak**: a 1px dashed `--fg` line across the plot, over the band and under the lines. Its `label` goes in the legend beside a dashed key. A label on the line would cover the live line's newest point at the right edge, and would need a flip rule near the top edge. In the legend it needs neither.
- **Legend as readout**: each line's name, then its last `y` in bold with the y unit. The value shows one decimal more than the y ticks, and a trailing `.0` is dropped. Then the target, then the peak. It is always drawn, even for one line. There is no hover and no tap: a live plot has nothing to pick, and the ADR gives it no action.
- **Axes**: the y label and unit go above the y ticks ("Force (kg)"), the x label and unit under the right end of the x ticks ("Edge (mm)", "Time"). Tick texts are bare numbers, or `m:ss`, or `h:mm:ss` on every tick of an axis that reaches an hour. `drawn` gives at most 6 x ticks and 5 y ticks, the same at every width. An x tick label on an edge aligns inward; one within 4% of an edge is hidden, so moving labels slide out without being clipped.
- **Phone**: the plot reads its own card width. Under 520px it is 150px tall (200px above) and the x labels of odd steps are hidden. A label's step is its value divided by the step, so a label never jumps as a live line moves. Nothing is measured in script, so the static page draws the same.
- **Live window**: until a window's span of points has arrived, the x range is the first point plus the window, and the line fills from the left. After that the newest point sits on the right edge. This adds one case to the ADR's `drawn` x range rule ("the last window up to the newest x") so the plot does not show negative time at the start. It is pinned by a `drawn` fixture case.
- **Empty**: the grid at the fixed range or 0 to the window, ticks where the range is fixed, the `empty` text on a card-colour patch in the middle, and the legend's names without values.
- **Long text**: the title and the legend wrap and are never cut.

## What impl builds

- `render/kind/plot.ts`: root `div.plot` with `b b-plot`, `data-block="plot"`, `data-id`, role `figure` named by the title. Parts `title` (`.plt`), `legend` (`.pll`), `axis` (`.plu`, `.ply`, `.plx`), `target` (`.plb`) and `peak` (the dashed `line.peak` and its legend item). The drawing `svg` is `aria-hidden`. `sync` updates the path's `d`, the markers, the legend's values and the tick texts in place.
- The CSS is `plot.css` here, about 25 rules, tokens only. Its sizes are chart's: a 32px y gutter, 200 and 150px heights, the meta text size.
- SwiftUI draws the same marks on a `Canvas` from `drawn`, with the legend and axis labels as `Text`.
- `plot.js` here is a preview-only port of the renderer and of `drawn`, used to draw these images; it is not product code. `page.css` stands in for #53's page and tiles. Images: `./render.sh` (Playwright's cached headless Chromium, light and dark, reduced motion).
