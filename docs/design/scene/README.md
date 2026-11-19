## Summary

Decision: the web draws `scene` as the Swift app does (its label, then one chip per lane), on #53's default pair, light and dark. Each chip is a square box with a small state square (green for working or merged, ochre for needs, brick red for fail, ink for done, hollow for idle), the title in bold and the state word. A second muted line adds what Swift leaves out: stage, tool and age. Chips wrap at desktop width, and each takes a full line on a phone.
Screens: drover's live and landed lanes in a page, and a sheet of every case (states, optional fields, tap, long titles, no label, no lanes). Each is drawn light and dark, at 1440 and 390.
Open questions: (1) Swift scrolls the chips sideways, and the web wraps them so that no lane is hidden. Is that OK? (2) Working is green here, as in the web's tags and `diagram`; Swift uses cyan. (3) `show` (a visibility expression) is not drawn: no web kind evaluates it yet. Should it stay out of this slice?

## Images

| Image | What it shows |
|---|---|
| `scene-light-1440.png`, `scene-dark-1440.png` | Two scenes in tiles on the dot-grid page. "Lanes · main host" has five lanes (working, working, needs, idle, fail), and each opens its lane when tapped. "Landed today" has two merged lanes that link to their PRs and one done lane with no tap, whose long title is cut with "…". Chips size to their content and wrap |
| `scene-light-390.png`, `scene-dark-390.png` | The same at phone width: one lane per line, with the state word at the right edge |
| `states-*-1440.png`, `states-*-390.png` | 1 each of the six states: only the marker carries colour, plus the state word for needs and fail. 2 the second line holds only the fields that are set, and is left out when none are. 3 tap: `open`/`sheet`/`action` makes a button (focus ring shown), `url` makes a link, and no tap makes a plain box. 4 a long title is cut at 32 characters wide (full width on a phone). 5 no label. 6 no lanes: the label alone, as on Swift |

## What impl builds

- `web/src/render/scene.ts` replaces `gap(n)`. The root is a `div.scn` (render adds `data-block="scene"` and `data-id`, the hooks' root; `gen/hooks.ts` lists no parts for `scene`). It holds a `.sh` label when `label` is set, then a `ul.scl` with one `li` per lane.
- A lane is a `.ln.<state>` (`data-id` = its id, `aria-label` "title, state"). It holds an `i.lnm` marker and a `.lnb` with `.lnh` (`.lnt` title, `.lns` state) and an optional `.lnx` line made of stage, tool and `ticked({since})` joined by " · ", so the age updates with the shell's tick. When `tap.url` is set it is an `a` (as a row's url); any other `tap` makes it `role=button`, `tabindex=0`, calling `c.tap(lane.tap)` on click and Enter.
- The CSS is `scene.css` here (about 20 rules, tokens only, square corners) and goes into `web/src/blocks.css`. The `@media` rule becomes the renderer's usual phone breakpoint.
- `scene.js` in this folder is a preview-only port used to draw these images; it is not product code. Images: `./render.sh` (Playwright's cached headless Chromium, light and dark, reduced motion). `page.css` is copied from `../diagram/` and stands in for #53's page and tile rules.
