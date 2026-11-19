## Summary

Decision: the showcase site wears the approved grey tile look, turned up: a wide two-column hero with a 64 px title and a slower, deeper build-up on the home page; every page is one blocks screen (link bar, page title, tiles on the dot grid); the gallery draws all 26 core kinds from their samples, the 7 with no HTML view marked "this is its fallback"; schemes show the default pair and the site's own "Paper" side by side with JS off, and the look sheet switches the whole site with JS on; numbers show the browser bench from `docs/bench-blocks.json` and CI's six perf budgets.
Screens: home, gallery, one kind's page (stat), schemes (plus the look sheet open), numbers, behaviours, islands; each at 1440 and 390 wide, home and gallery also dark.
Open questions: (1) the perf gate prints its times but writes no file, so the budgets show alone. Should the perf run write its measured times so they can sit next to the budgets? (2) Each kind gets its own page (`/gallery/stat/`) as well as its tile on the gallery. Is that one page per kind wanted, or only the gallery's sections? (3) Paper is light only. Should the site's own scheme have a dark one too?

## Images

| Image | What it shows |
|---|---|
| `home-1440.png`, `home-390.png` | Home: a link bar tile (brand, the five pages, github), then a hero (title, one line, a picture of tiles, actions *see the kinds*, *github*, *docs* as links), four figure tiles, *what blocks is* in prose beside the Rust that builds the page, and a *Look around* list linking every page. At 390 the hero stacks and the links wrap under the brand |
| `home-dark-1440.png`, `home-dark-390.png` | The same in the default dark scheme, from the device setting |
| `gallery-1440.png`, `gallery-390.png` (and `-dark`) | Gallery: one jump link per kind, then five groups (layout, words and pictures, lists and figures, input, fallback only). Each kind is a tile: its name (a link to its page), one line, and the real renderer's HTML for its sample inside a dashed box. The seven fallback kinds carry an ochre marker: *No HTML view yet: this is its fallback*. Three across at 1440, one at 390 |
| `kind-stat-1440.png`, `kind-stat-390.png` | One kind's page: drawn (the sample, then several tiles with a unit and a tone), the sample JSON with its Rust line, the fallback a renderer without the kind draws, its style hooks, and previous and next kind links |
| `schemes-1440.png`, `schemes-390.png` | Schemes, JS off: three panels side by side (stacked at 390), each the same swatches, rows, figures and buttons in Default light, Default dark and Paper, then *Bring your own* and Paper's JSON. A *look* button sits above the panels |
| `schemes-sheet-1440.png`, `schemes-sheet-390.png` | JS on: the shell's look sheet open, listing *the app's own* (follows the device), Default light, Default dark and Paper; Paper is picked and the whole page wears it |
| `numbers-1440.png`, `numbers-390.png` | Numbers: where and how it was measured (machine, WebKit, date, runs), then figure tiles for first paint (cold, warm), one update (changed, inserted, 20 changed; time and bytes), weight (script gzipped, memory), and the six budgets CI holds, each marked *budget*. No other framework is named |
| `behaviours-1440.png`, `behaviours-390.png` | Follow-up issue: a form with a failing email check (brick marker and message), a toggle that shows *How often*, a disabled *sign up*, and the state and view it gives. Beside it, the rules and where they run (web, SwiftUI, static page with JS off) |
| `islands-1440.png`, `islands-390.png` | Follow-up issue: an island before it loads (its fallback row in its reserved 16:7 box) and mounted (a bar chart with one bar picked, and the line its `pick` event changed), its contract (name, props in, events out, size) and its Rust |

## Decisions

- **Every page is a blocks screen.** Link bar (`nav`), page title (the screen's title), then blocks. The site's CSS styles only the hooks (`.b-*`, `data-block`, `data-id`) on top of `blocks.css` and the default tokens; the mockups load `web/src/blocks.css` and `../neutral-default/tokens.css` as they are.
- **The tile look, turned up.** Each top-level block is a white square tile with a 1 px edge on the dot grid, 2 px seams within a group; section labels sit on the page. Text is 15 px instead of 13. The home hero's title is 64 px (40 at 390). The home page's build-up is slower and deeper than the default: each tile rises 24 px over 520 ms, starts 90 ms apart, and the last starts by 720 ms. The other pages keep the default build-up. Reduced motion: none.
- **Links, not forms.** The hero's actions are acts with a URL, so they render as `a.btn` and work with JS off. No page posts anything: Pages has no server.
- **The gallery uses the real HTML.** Each kind's tile holds what the HTML renderer writes for `fixtures/blocks/<kind>.json`, today's `fixtures/html/<kind>.html`. The sample pictures (`/media/*.png`) stand in as `media/sample.svg`.
- **Paper, the site's own scheme.** Warm greys and an ink-blue accent; the state colours of the default, with brick and ochre a touch darker for the warmer page. Measured contrast on page and card: text 14.7 and 16.3, muted 6.6 and 7.3, accent 9.0 and 10.0, brick 4.9 and 5.4. It must pass `theme::gate` in CI; impl adjusts a value if it does not.
- **Sub-path and head.** Every link is relative, so the site works under `/blocks/`. Each page sets its title, description, `og:*` and `twitter:card` tags.

## Files

`build.mjs` writes the pages from `fixtures/html`, `fixtures/blocks` and `docs/bench-blocks.json`; `render.sh` runs it and renders the PNGs with Playwright's cached headless Chromium (settled, reduced motion). `site.css` is the site's own stylesheet over the hooks; impl ports it. `media/` holds the hero picture and the sample picture. These files are mockups only: the real site is a Rust generator writing each page with `site::page`.
