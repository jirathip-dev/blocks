## Summary

Decision: the web draws `diagram` the way the Swift app does. States run top to bottom in one main column, with side steps in a left and a right column. Each state is a square box showing its name and its count. Timers are dashed boxes. Look: #53's built-in default pair, light and dark. Revised colours only (q2150): the five state colours are #53's muted set (brick red, moss green, ochre, dusty purple, slate teal), used only in text and small markers. A changed count now gets a 3px edge marker instead of a coloured border.
Screens: drover's issue workflow inside a page, and a sheet of every node and line state. Each is drawn light and dark, at 1440 and 390.
Open questions: (1) As you asked, I kept everything except colour. These pages still differ from #53 (62148b8) in four ways: a 3px seam (#53: 2px), round dots (#53: 2px squares), no tile outline (#53: 1px), and the settle timing. Should impl take #53's values, since #53 wins? (2) "Still under reduced motion": I read it as "no movement". (3) Should the B1 sample become a state chart? Is cutting phone names with "…" acceptable?

## Images

| Image | What it shows |
|---|---|
| `diagram-light-1440.png`, `diagram-dark-1440.png` | drover's issue chart on the dot-grid page. The header, three stat tiles, the diagram tile and the needs-you tile are square tiles with a 3px seam between them. On the wide sizes (side 156, main 176, right 140 px): the start dot; `queued` down to `merged`; `design`, `design review` and `verify` are marked optional because an edge skips them; `impl` is selected (2px ink ring); `review` changed from 2 to 1 (grey border, 3px moss-green edge marker, "was 2"); `blocked`, `fix` and `needs human` are on the right; the `stall` and `review rounds` timers are on the left, with dashed ink lines. The heading link is ink and underlined. The needs-you tile is plain, with a 4px brick-red edge marker and its header in brick red |
| `diagram-light-390.png`, `diagram-dark-390.png` | The same chart at phone sizes (108 / 100 / 78 px). A container query switches to them at 600px, so the chart fits 390 without scrolling |
| `states-light-*.png`, `states-dark-*.png` | 1 the count takes its state's text colour (moss green for working and merged, ochre for needs, brick red for fail, ink for done), and a 0 is muted. 2 a changed count (3px edge marker in its tone), and `selected`. 3 an edge that skips a step is not drawn, and the skipped step says "optional". 4 a both-way pair is one line with two heads; a side step that returns goes right, one that only leaves goes left, and two side steps far apart join through the left gutter. 5 timers. 6 first load: the tile settles in, frames at 0 to 200 ms. 7 a source with no readable state draws the fallback row |

## The look (revision q2140)

- Colours (revision q2150): only #53's 19 default tokens at 62148b8, light on `:root` and dark by the OS setting, with the five state colours muted. No named scheme and no app look. State colours appear only in text (counts in `--fk-g`, `--fk-a`, `--r`) and small markers (a changed node's 3px edge in `--g`, `--a` or `--r`; the needs-you tile's 4px `--r` edge). No tinted surface, no coloured border, no coloured fill. Node borders are always `--edge`, `selected` is an ink ring, timers and their lines are `--link` (ink). The dot grid uses `--edge`, so there is no 20th colour.
- Tiles: every block is a square `--card` tile on a visible grid, with a 3px seam where the page shows through. The page has a faint 16px dot grid. Nodes are square and filled with `--bg`, so they read as boxes inside the tile.
- Settle: on first load each tile rises 6px and fades in over 0.2 s, starting 30 ms after the one before (capped at the sixth), so everything is done under 0.4 s. It runs once and only moves and fades. With reduced motion there is no animation. The diagram settles as one tile: its nodes do not move on their own, and a later redraw (new counts) never replays it. The images were rendered with reduced motion, so they show the settled state.
- `page.css` stands in for #53's page and tile rules, for these previews only. `diagram.css` is all that `diagram` adds.

## What impl builds

- `web/src/render/diagram.ts` replaces `gap(23)`, using the Swift `Chart` subset as-is: `state "Name" as id`, `state id`, `a --> b` (a `: label` is ignored), and `[*]`. The main column is the longest forward path from `[*]`'s target, with the first longest path winning ties. Side placement, skipped edges and routing follow `swift/Sources/BlocksUI/BlockDiagram.swift` line for line.
- DOM: a `div.dg` (role `group`, labelled by `title`, default "Workflow") holds two maps, `.dgm.wide` and `.dgm.phone`. Each map is an `svg` of lines and arrowheads under absolutely placed `.dgn` nodes. CSS shows one of them (container query, < 600px phone), so nothing is measured in JS and a static page draws right.
- A node with `tap` is `role=button` and `tabindex=0` and calls `c.tap(node.tap)`, like a row. A node with `limit` is a timer pill, and any edge touching it is dashed in `--link`.
- "was N" compares the counts with the block's previous draw (kept per block id in the renderer). As on Swift, it stays until the counts change again.
- A source with no state draws the block's fallback, as the gap does now.
- The CSS is `diagram.css` here, about 30 rules (tokens only, square corners), and goes into `web/src/blocks.css`. Budget: about 140 TS lines against +150.
- `diagram.js` in this folder is a preview-only port used to draw these images; it is not product code. Images: `./render.sh` (Playwright's cached headless Chromium, light and dark, reduced motion).
