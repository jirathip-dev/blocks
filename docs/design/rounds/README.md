## Summary

Decision: on the web, a row that carries `rounds` becomes a fold, as on Swift. Folded, it is today's row plus a chevron. Open, its rounds hang under it on a thin rail: one line per round (name, a short summary in its state colour, its age), a small square marker in the state colour, the last round's marker larger. Only the last round shows a body: its lane and live log lines, its blocks, its links as buttons. It opens by itself when the last round needs you. A row with no rounds is drawn exactly as today. Look: #53's merged default pair, colour only in markers and text.
Screens: an issue list with four rows (needs you and open by itself, working and opened, folded, no rounds), and a sheet of every state. Each light and dark, at 1440 and 390.
Open questions: (1) Swift draws round markers as circles; I made them square to match #53's square markers. Keep square? (2) Should the fold's open or shut state survive a redraw only (like other folds, `c.open`), or be remembered across visits? I assumed redraw only.

## Images

| Image | What it shows |
|---|---|
| `rounds-light-1440.png`, `rounds-dark-1440.png` | An issue list tile. `#23` ends in a `needs` round, so it is open without a tap: five rounds on the rail, past ones with a verdict tap show `›`; the last (`review 3`) has a 12px red marker and a body with its text block and three link buttons, edged by a 3px red marker on the left. `#12` was opened by a tap: its current round is `working` (ochre), its body shows the lane head (`name · harness · model · host`), its log lines in mono with the live last line in ochre after `▍`, and a link button. While open, a row's subtitle hides and its chevron points down. `#44` is folded: today's row plus `›`. `#61` has no rounds and is today's row, unchanged |
| `rounds-light-390.png`, `rounds-dark-390.png` | The same at phone width: nothing scrolls sideways; summaries and log lines end in "…" |
| `states-light-*.png`, `states-dark-*.png` | 1 markers and tones for every state (green done/merged, red fail/needs, ochre working, grey idle). 2 folded vs open, and open by itself on `needs`. 3 a past round with a tap (button, or link for a url, with `›`) vs without; the current round's line never taps. 4 the body: lane only; a last round with no lane, blocks or links draws no body. 5 long names, summaries and log lines cut with "…", the time never shrinks. 6 no rounds or an empty list: the row as today |

## What impl builds

- `web/src/render/row.ts`: when `b.rounds` is non-empty, wrap the row in `div.rr` (`.open` when open). The row line gets `role=button`, `tabindex=0`, `aria-expanded`, a trailing `span.rc` "›", and its click toggles the fold (the row's own `tap` is not used then, as on Swift). Open = (last round is `needs`) XOR the user flipped it; the flip is kept in `c.open` under the row id, so a redraw keeps it. While open the subtitle is left out.
- Open: an `ol.rds` of `li.rd.<state>` (`.now` on the last), each with `i.rdm` (the marker, `aria-label` = its state) and a line `.rdl` holding `.rdn` name, `.rdu` summary, `.rdt` since (through `ticked`, like a row value) and, for a past round with a tap, `.rc` "›"; that line is an `a` for a `url` tap, else `role=button` calling `c.tap`.
- The last round's `.rdb` body, only if it has a lane, blocks or links: `.rdh` lane head, `.rdo` lines (the last one `.live` with "▍ " while `working`), its `blocks` through `kids`, its `links` as `btn`s calling `c.tap`.
- CSS: `rounds.css` here (about 25 rules, tokens only, square corners) goes into `web/src/blocks.css`. `page.css` only stands in for the host page.
- `rounds.js` here is a preview-only drawing used for these images, not product code. Images: `./render.sh` (Playwright's cached headless Chromium, light and dark, reduced motion).
