## Summary

Decision: the web draws `diagram` the way the Swift app does. States go top to bottom in one main column, with side steps in a left and a right column. Each state is a card with its name and a count in its state's colour. Timers are dashed blue-ish pills. It uses only the existing colours, with no new tokens.
Screens: drover's issue workflow inside a page, and a sheet of every node and line state (colours, a changed count, selected, optional, both-way lines, side columns, timers, a light scheme, nothing to draw). Each at 1440 and 390.
Open questions: (1) the B1 sample diagram is written in a format the reader ignores (`graph TD; a-->b`), so it draws only its fallback, on Swift too. Should a later issue change the sample to the state-chart format? (2) On a phone, long names are cut with "…" (the full name shows on hover and to screen readers). Swift shrinks the text instead. Is cutting acceptable?

## Images

| Image | What it shows |
|---|---|
| `diagram-1440.png` | drover's issue chart in a screen, on the wide sizes (side 156, main 176, right 140 px): the start dot; `queued` down to `merged`; `design`, `design review` and `verify` marked optional because an edge skips them; `impl` selected (2px ink ring); `review` changed from 2 to 1 (green border, "was 2"); `blocked` and `fix`/`needs human` on the right; the `stall` and `review rounds` timers on the left with dashed lines |
| `diagram-390.png` | The same chart on the phone sizes (108 / 100 / 78 px), switched by a container query at 600px, so it fits 390 without scrolling. Long names are cut with "…" |
| `states-1440.png`, `states-390.png` | 1 the count takes the state's colour (working and merged green, needs amber, fail red, done ink), and a 0 is muted. 2 a changed count and `selected`. 3 an edge that skips a step is not drawn, and the skipped step says "optional". 4 a both-way pair is one line with two heads; a side step that returns goes right and one that only leaves goes left; two side steps far apart join through the left gutter. 5 timers. 6 Farm light, where only the tokens change. 7 a source with no readable state draws the fallback row |

## What impl builds

- `web/src/render/diagram.ts` replaces `gap(23)`, using the Swift `Chart` subset as-is: `state "Name" as id`, `state id`, `a --> b` (a `: label` is ignored), and `[*]`. The main column is the longest forward path from `[*]`'s target, with the first longest path winning ties. Side placement, skipped edges and routing follow `swift/Sources/BlocksUI/BlockDiagram.swift` line for line.
- DOM: a `div.dg` (role `group`, labelled by `title`, default "Workflow") holds two maps, `.dgm.wide` and `.dgm.phone`. Each map is an `svg` of lines and arrowheads under absolutely placed `.dgn` nodes. CSS shows one of them (container query, < 600px phone), so nothing is measured in JS and a static page draws right.
- A node with `tap` is `role=button` and `tabindex=0` and calls `c.tap(node.tap)`, like a row. A node with `limit` is a timer pill, and any edge touching it is dashed in `--link`.
- "was N" compares the counts with the block's previous draw (kept per block id in the renderer). As on Swift, it stays until the counts change again.
- A source with no state draws the block's fallback, as the gap does now.
- The CSS is `diagram.css` here, about 30 rules, and goes into `web/src/blocks.css`. Budget: about 140 TS lines against +150.
- `diagram.js` in this folder is a preview-only port used to draw these images; it is not product code. Images: `./render.sh` (Playwright's cached headless Chromium).
