## Summary

Decision: on the web, a row that carries `rounds` becomes a fold, as on Swift. Folded, it is today's row plus a chevron. Open, its rounds hang under it on a thin rail: one line per round (name, a short summary, its age) and a small square marker, the last round's larger. Only the last round shows a body: its lane and live log lines, its blocks, its links as buttons. It opens by itself when the last round needs you. A row with no rounds is drawn exactly as today. Revised (q2186), colours only: the state table of the scene design and the diagram (working and merged green, needs ochre, fail brick red, done ink, idle a hollow square); a summary takes its marker's tone. Shared controls follow #53/#57: box buttons, square tags with a grey edge.
Screens: an issue list with four rows (needs you and open by itself, working and opened, folded, no rounds), and a sheet of every state. Each light and dark, at 1440 and 390.
Open questions: none. Markers stay square; the fold's state lasts for the visit only, as decided in q2186.

## Images

| Image | What it shows |
|---|---|
| `rounds-light-1440.png`, `rounds-dark-1440.png` | An issue list tile. `#23` ends in a `needs` round, so it is open without a tap: five rounds on the rail, past ones with a verdict tap show `›`; the last (`review 3`) has a 12px ochre marker and an ochre summary, and a body with its text block and three box buttons, edged by a 3px ochre marker on the left. Done rounds have ink markers, fail rounds brick red. `#12` was opened by a tap: its current round is `working` (green), its body shows the lane head (`name · harness · model · host`), its log lines in mono with the live last line in green after `▍`, and a box button. While open, a row's subtitle hides and its chevron points down. `#44` is folded: today's row plus `›`. `#61` has no rounds and is today's row, unchanged |
| `rounds-light-390.png`, `rounds-dark-390.png` | The same at phone width: nothing scrolls sideways; summaries and log lines end in "…" |
| `states-light-*.png`, `states-dark-*.png` | 1 markers and tones for every state (green working/merged, ochre needs, brick red fail, ink done, hollow square idle). 2 folded vs open, and open by itself on `needs`. 3 a past round with a tap (button, or link for a url, with `›`) vs without; the current round's line never taps. 4 the body: lane only; a last round with no lane, blocks or links draws no body. 5 long names, summaries and log lines cut with "…", the time never shrinks. 6 no rounds or an empty list: the row as today |

## What impl builds

- `web/src/render/row.ts`: when `b.rounds` is non-empty, wrap the row in `div.rr` (`.open` when open). The row line gets `role=button`, `tabindex=0`, `aria-expanded`, a trailing `span.rc` "›", and its click toggles the fold (the row's own `tap` is not used then, as on Swift). Open = (last round is `needs`) XOR the user flipped it; the flip is kept in `c.open` under the row id, so a redraw keeps it. While open the subtitle is left out.
- Open: an `ol.rds` of `li.rd.<state>` (`.now` on the last), each with `i.rdm` (the marker, `aria-label` = its state) and a line `.rdl` holding `.rdn` name, `.rdu` summary, `.rdt` since (through `ticked`, like a row value) and, for a past round with a tap, `.rc` "›"; that line is an `a` for a `url` tap, else `role=button` calling `c.tap`.
- The last round's `.rdb` body, only if it has a lane, blocks or links: `.rdh` lane head, `.rdo` lines (the last one `.live` with "▍ " while `working`), its `blocks` through `kids`, its `links` as `btn`s calling `c.tap`.
- CSS: `rounds.css` here (about 26 rules, tokens only, square corners; the same state table as `scene`'s `.lnm`) goes into `web/src/blocks.css`. `page.css` only stands in for the host page and for #53/#57's shared controls (box buttons, square tags with a grey edge); impl takes those from #57, not from here.
- `rounds.js` here is a preview-only drawing used for these images, not product code. Images: `./render.sh` (Playwright's cached headless Chromium, light and dark, reduced motion).
