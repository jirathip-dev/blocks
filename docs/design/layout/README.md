## Summary

Decision: a Layout page on the showcase draws one `layout.json` (four screens of a small garden app: Today, Plants, Weather, Settings) as a phone (`compact`: two tabs, Weather as a sheet, Settings behind menu) or as a wide window (`wide`: Plants in a side column, Today as the main panel, Weather as a card), with a two-button size switch above, the file itself beside the drawing with the current size's places highlighted, a "where each screen goes" list, and the site's contract with an example refusal.
Screens: the Layout page in `compact` and in `wide`, each at 1440 and 390 wide, plus `wide` in dark and `compact` in Paper.
Open questions: none.

## Images

| Image | What it shows |
|---|---|
| `wide-1440.png`, `wide-390.png` | The switch set to *wide*. The drawing is a 1024 × 640 window, scaled to fit the tile: Plants as a `column` on the left, Today as the `panel`, Weather as `cards` on the right, and a bar with only *menu* (Settings). In the file, each node's `wide` value is highlighted. At 390 the window is drawn to scale (about a third of its size), so it shows the arrangement, not readable text |
| `compact-1440.png`, `compact-390.png` | The switch set to *compact*. The drawing is a 360 × 700 phone: Today as the open tab, the tab bar *today · plants · menu*, and Weather open as a `sheet` over a dimmed Today. The tab bar stays visible above the sheet. Each node's `compact` value is highlighted. The blocks inside each screen are the same as in *wide*: only where they sit changes |
| `wide-dark-1440.png`, `wide-dark-390.png` | The same page in the default dark scheme, from the device setting |
| `compact-paper-1440.png`, `compact-paper-390.png` | The same page in Paper, the site's own scheme |

## Decisions

- **One drawing, two places.** The four screens are the same elements in both sizes. The switch only changes the size class, and each screen moves to its new place. Every screen has a small dashed tag (`strip`, `panel`, `sheet`, `cards`, `column`, `menu`) naming the place the file gives it at the current size.
- **Places follow the web shell.** `strip` is a tab, `sheet` and `menu` sit behind the menu button (a sheet opens over the page), and `panel`, `column` and `cards` are always on screen, as `mount` draws them. Impl should draw the result with the shell's own `mount` where it can, rather than a copy.
- **The switch.** A chips block with *compact* and *wide* (pressed state as #53's chips). With JS on it starts on the visitor's own size class (wide at 1000 px and up, like the shell) and flips without a reload. With JS off the switch is hidden and the drawing follows the window width by a media query.
- **The file is shown, and tied to the drawing.** `layout.json` is printed as is, one key per line so it fits at 390 without scrolling sideways. The value for the current size is highlighted, and so is a place that holds on both sizes (`"menu"`).
- **Checked at build.** The site's contract adds no components beyond `nav` and locks `/screens/account`. `layout::check` runs on the file when the site builds. A tag says it passes, and an example refusal shows what a broken file gives: its line, column and why.
- **Motion.** On a switch each screen slides and scales from its old place to its new one (transform and opacity, 280 ms, the shell's easing). A screen that only appears fades in. Under reduced motion it is instant.
- **Names.** The app, its `garden` source and its screens are the site's own. No other product is named.

## Files

`layout.json` is the file the page shows (impl moves it into the site). `build.mjs` writes `layout.html` from it. `layout.css` sits on top of the showcase's `site.css`. `layout.js` is the mockup's switch and its motion. `render.sh` builds the page and renders the PNGs with Playwright's cached headless Chromium (reduced motion; `?size=` and `?look=paper` choose the state). These are mockups only: the real page is written by the site's Rust generator.
