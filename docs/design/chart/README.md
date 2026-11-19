## Summary

Decision: one chart kind draws bar, stacked, line, bar+line combo and donut on blocks' default look (square tiles, ink first, the muted tones). The legend doubles as the readout: it names each series and shows its value for the chosen month, so a phone needs no floating tooltip. Tapping a month (or a donut slice) picks it and sends the block's action. One value format per chart (THB, ฿M, %, count), so a combo always has one shared axis. Months can read in the Buddhist Era and in Thai. Every chart carries its numbers as a table.
Screens: a sales dashboard with all five chart types, and a sheet of every state (tap, hover, eras, many months, long names, empty, table, formats, fallback). Each light and dark, at 1440 and 390.
Open questions: (1) The muted tones are close: series colours pass the colour-blind check but sit just under the "easy to tell apart" bar for normal vision, so I lean on the legend, gaps and the table. Keep them, or allow stronger chart-only colours? (2) A chart allows at most 5 series, and a donut folds the rest into "Other". Is 5 right for synergy's screens? (3) Should a combo whose line needs a different unit (say % on ฿ bars) be refused, as drawn here, or split into two charts by the renderer?

## Images

| Image | What it shows |
|---|---|
| `chart-light-1440.png`, `chart-dark-1440.png` | A Thai fiscal-year sales page (Oct 2566 to Sep 2567). **Combo**: Revenue bars in ink with a Target line in ochre (`warn` tone), March picked: a `--line` band behind the column, a bold "Mar 67" label, an 8px square point on the line, and the legend reading "Mar 2567 · Revenue ฿1.3M · Target ฿1.2M". **Stacked**: Store, Online and Wholesale in the default order (ink, teal, ochre) with a 2px card gap between segments; nothing picked, so the legend reads the last month. **Donut**: seven spend categories, the two smallest folded into "Other (3)"; the middle shows the total; its rows are the legend with value and share. **Line**: this year in ink against last year in `mute`, dashed. **Bar**: a Thai screen, Thai month names, Buddhist-Era years, `info` tone |
| `chart-light-390.png`, `chart-dark-390.png` | The same page on a phone. Cards stack. Each chart's labels thin to six, the plot drops to 150px tall, the donut's rows move under the ring. Every month column stays tappable (about 28px wide, the full plot tall) |
| `states-light-*.png`, `states-dark-*.png` | 1 tap a month, and the action it sends. 2 hover on the web: a 1px crosshair, and the legend follows. 3 the same months in Gregorian English and in Buddhist Era Thai. 4 24 months: labels thin to 12 (wide) or 6 (narrow), all bars drawn. 5 long titles and series names wrap; a `bad` tone series. 6 a picked donut slice: it thickens, its row gets the 3px ink edge, the middle reads it. 7 empty: axes and the block's empty text, nothing tappable. 8 the table, opened. 9 the four value formats. 10 the fallback row an older client draws |

## The decisions

- **Kinds of chart**: `bar` (one series, or several side by side), `stacked`, `line`, `combo` (each series says bar or line; the bars stack when there are several) and `donut` (one series over named slices). `stat.spark` stays the small sparkline.
- **Colours**: a series with a tone takes its token (`ok` moss green, `warn` ochre, `bad` brick red, `info` teal, `accent` purple, `mute` grey). A series with no tone takes the next of ink, teal, ochre, purple, moss green, in that fixed order. Colour follows the series, never its rank, so a filtered-out series never repaints the rest. Only #53's 19 tokens are used; text never takes a series colour.
- **Why the extra cues**: run through the dataviz palette check, the muted tones pass colour-blind separation (ΔE 9 or more) but miss the normal-vision floor (ΔE about 13, where 15 is wanted). So identity never rests on colour alone: the legend is always there, with names; stacked segments have 2px gaps; a comparison line is dashed; and the table has every number.
- **Marks**: square corners, as everywhere in the default look. Bars start at zero. Lines are 2px. A point is an 8px square with a 2px card ring, drawn only at the picked month. Grid lines are `--line`, the baseline is `--edge`, axis text is `--mute` at the meta size. Three y ticks (0, half, top), rounded up to a round number.
- **Legend as readout**: the legend row shows the picked month (or the last one) and each series' value there. Hover on the web moves it; tap pins it. No floating tooltip, which works the same on touch.
- **Tap**: each month is one tap target, the full height of the plot. Tapping picks it and sends the block's `tap` action with `x` (the month). A donut sends the slice name. The chart's columns drop the `[ ]` button brackets: they would crowd the plot, and the band shows the pick.
- **Months and the era**: x values written as `YYYY-MM` read as months: short name and a two-digit year on the axis, full year in the legend and table. `era: be` adds 543. Month names follow the screen's language (Thai on a Thai screen). Any other x value is drawn as written.
- **Formats**: `thb` (฿12,345,678), `thb_m` (฿12.3M, ฿845K), `percent` (31.4%), `count` (3,184). One format per chart, used by the axis, legend and table, so there is never a second axis.
- **Limits**: up to 5 series; a 6th is a check error. A donut shows its 4 biggest slices plus "Other (n)" when there are more than 5.
- **Phone**: the chart reads its own card width, not the page. Under 700px the labels thin to 6; under 520px the plot is 150px tall and the donut stacks. Nothing is measured in script, so the static site draws the same.
- **Table and fallback**: every chart ends with a closed "Table" with all numbers; the static site writes the same element. An older client draws the fallback row: the title and the block's summary line.

## What impl builds

- The wire shape these pages assume: `type: chart`, `title`, `chart` (one of the five), `x` (list), `era`, `format`, `series` (each: `name`, `values`, optional `tone`, `as`, `dash`), `selected`, `empty`, `tap`, and the usual `fallback`.
- HTML: a `div.card.chart` (role `figure`, named by its title). Bars and lines are one stretched `svg` with non-scaling strokes; labels, points and tap columns are positioned by percent. Each column is a `button` named like "Mar 2567: Revenue ฿1.3M, Target ฿1.2M". The CSS is `chart.css` here (about 45 rules, tokens only) and goes into `web/src/blocks.css`.
- SwiftUI and the React adapter draw the same marks, legend and table.
- `chart.js` in this folder is a preview-only port used to draw these images; it is not product code. Images: `./render.sh` (Playwright's cached headless Chromium, light and dark, reduced motion). `page.css` stands in for the default page.
