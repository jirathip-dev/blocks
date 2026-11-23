## Summary

Decision: a new `boxplot` kind in the chart family's look, not a sixth chart type. One upright box per category gives min, Q1, median, Q3 and max, with optional outlier points beyond the whiskers. The value axis has a label and unit, and fits the data instead of starting at zero. Boxes with no tone are all drawn in ink, so a tone stands out. As in the chart, the row under the title is the readout. Tapping a box picks it and sends one action, and the row then shows its five numbers and its outliers. With nothing picked, the row is a key to the marks. The type refuses a box whose values are out of order, and an outlier that sits inside the whiskers.
Screens: a grip-force page (two hands with outliers, four fingers, ten sessions), and a sheet of every state and stress fixture. Each light and dark, at 1440 and 390.
Open questions: (1) Should the axis start at zero (a `zero` switch, or always)? As drawn, it fits the data, which shows the spread better. (2) Should a box carry its count of reps (n) for the readout and table? It's not in the issue, so it's left out. (3) With many boxes on a phone (say 40 sessions), should the plot turn sideways, one row per box, or stay upright with thinned labels as drawn?

## Images

| Image | What it shows |
|---|---|
| `force-light-1440.png`, `force-dark-1440.png`, `force-*-390.png` | **Peak force per hand** (the two-category fixture with outliers): Left is picked. A `--line` band sits behind its box, its label is bold, and the readout row reads "Left · median 33.1 kg · Q1–Q3 30.4 – 36.0 · min–max 25.8 – 41.2 · outliers 18.0, 47.5". **Force share per finger**: four boxes. Nothing is picked, so the readout row is the key. Little finger has the `warn` tone. **Peak force per session**: ten sessions. 16 Oct has the `bad` tone, and 18 Nov is picked. On a phone the cards stack and the labels thin to every other session |
| `states-light-1440.png`, `states-dark-1440.png`, `states-*-390.png` | 1 picked, with the action it sends and what VoiceOver says. 2 nothing picked: the key. 3 24 boxes (the many-row fixture): boxes narrow, never under 6px, and labels thin. 4 long title and long labels (the long-text fixture). 5 every tone. 6 equal values: a single rep, a median on a quartile, no whiskers. 7 empty (the empty fixture). 8 the table, opened. 9 what the check refuses. 10 the fallback row an older client draws |

## The decisions

- **Wire** (what impl builds): `type: boxplot`, `title`, `axis` (the value axis label), `unit` (optional, e.g. "kg"), and `boxes`. Each box has `name`, `min`, `q1`, `median`, `q3`, `max`, and optional `outliers` (a list) and `tone`. The block also takes `selected` (a box name), `empty`, `tap`, and the usual `id` and `fallback`. A separate kind, because a box's five numbers don't fit the chart's series-of-values shape.
- **Check**: each box needs min ≤ q1 ≤ median ≤ q3 ≤ max (equal values are allowed). Every outlier lies below min or above max, every number is finite, and box names are unique. Each failure is a check error that names the box and the values. Impl adds a test for each.
- **Marks**: the box (Q1 to Q3) has a 2px outline in the box's colour and a fill of that colour at 18% over the card (`color-mix` of tokens). The median is a 3px bar across the box. The whiskers are 1px lines with caps half the box wide. An outlier is a hollow 7px square, matching the default look's square marks. A box is at most 48px wide and at least 6px. Corners are square, and only tokens are used.
- **Colour**: a box with no tone is ink (`--l`). A tone (`ok`, `warn`, `bad`, `info`, `accent`, `mute`) takes the chart's tone token. Unlike chart series, boxes don't cycle colours, because the categories are one measure.
- **Axis**: the label and unit sit above the ticks ("Peak force (kg)"). Ticks are round steps, four or five of them, with a margin past the outermost value. Grid lines use `--line` and the bottom line uses `--edge`. Values are shown with the decimals the data has, up to 2.
- **Readout and tap**: each box's column is one tap target, the full height of the plot. A tap picks the box and sends `tap` with `x` (the box name). Reading the numbers needs no floating tooltip, which suits touch, as in the chart. Each column is a button named like "Right: median 35.6 kg, quartiles 32.9 to 38.1, range 28.2 to 43.0, 1 outlier: 21.4".
- **Phone**: the layout follows its own card width (container queries), not the page, and the plot drops to 150px tall under 520px, as in the chart. Labels thin to 12 on a wide card and to 8 under 700px. A long label ends in an ellipsis, and the readout and table give it in full.
- **Table and fallback**: a closed "Table" lists Min, Q1, Median, Q3, Max and Outliers for every box. An older client draws the fallback row: the title and a summary line.
- **Fixtures** (from the issue's AC, plus the stress rule): two categories with outliers, many categories (24), outliers, long text, and empty.

## Files

`force.html` and `states.html` are the pages. `boxplot.js` is a preview-only renderer used to draw the images, not product code. `boxplot.css` is what impl adds as `web/src/css/kind/boxplot.css`, on top of the chart's classes (`.chart`, `.chl`, `.chg`, `.chy`, `.chp`, `.chx2`, `.chc`, `.chb`). The pages load `web/dist/blocks.css` and `../neutral-default/tokens.css`. Images: `./render.sh` (Playwright's cached headless Chromium, light and dark, reduced motion).
