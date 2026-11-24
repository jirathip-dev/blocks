## Summary

Decision: a `section` gets one new optional field, `side: true`. Once a screen is at least 720 px wide (its own width, so the shell's 1000 px wide class with a panel), its side sections move into a 320 px right column, 32 px from the main column. Below that width they stack after the main blocks, in their own order. A screen with no side section draws exactly as today.
Screens: a delivery stop (main column plus a "Trip summary" and a "Customer" side card) and a rules sheet (no side, a narrow place on a wide window, all-side, the check's faults), each light and dark at 1440 and 390.
Open questions: (1) Should the side column stick to the top while the main column scrolls? Drawn not sticky. (2) Is "after the main blocks" right on phones, or do apps need a way to put a side card first (e.g. `side: "first"`)? Drawn: always after.

## Images

| Image | What it shows |
|---|---|
| `delivery-light-1440.png`, `delivery-dark-1440.png` | The fixture screen at 1440: the screen's title bar runs full width. Below it the main column (stepper, lines, the two loose buttons) fills the rest, and a 320 px side column holds Trip summary and Customer. The columns are 32 px apart (`2 × --dot-gap`, the same gap sections have). The first side section loses its top margin, so it lines up with the main column's first tile. The tiles, rows and stat look as they do today |
| `delivery-light-390.png`, `delivery-dark-390.png` | The same screen at 390: one column. Stepper, Lines and the buttons come first, then Trip summary and Customer, in their own order |
| `rules-*-1440.png`, `rules-*-390.png` | 1: the same stop with `side` removed draws in one column, in source order, as today: no wrapper, no container. 2: the delivery stop in a 600 px place on a wide window stays one column, because the rule reads the screen's own width, not the window's. 3: a screen whose sections are all `side` has nothing left for the main column, so it does not split. 4: the faults `Built::check` reports: `side` on a section that is not a screen's own block, inside a sheet, or on a focus screen |

## Rules impl follows

- **Schema.** `Section.side: Option<bool>`. It counts only on a section placed straight in a `screen`'s `blocks`, and is a `Built::check` fault elsewhere (nested, in a sheet, on a `focus` screen). Only sections can go to the side, so a side card always has a header that names it. Needs a For apps line and `just gen`.
- **Split.** A screen with at least one side section and at least one other block draws `.scr.split > .tabh, .scr-cols > (.scr-main, aside.scr-side)`. Everything that is not a side section goes in main, in order. The side column is an `aside` (complementary) named by its sections' headers. DOM order is main, then side, which is also the reading order. Without the split, the screen's DOM is unchanged.
- **Width.** The rule is a container query on the screen at 720 px: 320 px side, 32 px gap, and at least 368 px for main, so main is never narrower than a phone. A screen in the shell's 1000 px wide class gets this in its panel. In a `column` place or a narrow host it stays one column. Grid: `minmax(0,1fr) calc(20 * var(--s4))`, gap `calc(2 * var(--dot-gap))`, aligned to the top. Tokens only (`side.css`, about 6 rules for `screen.css`).
- **Carry-over.** `bar.css`'s `.scr>button` spacing must also cover `.scr-main>button` and `.scr-side>button` (in the first draft the buttons ran together without it).
- **React** draws the same thing through the same DOM renderer. **SwiftUI**: regular horizontal size class *and* a width of at least 720 pt gives an `HStack(alignment: .top)` with main flexible, side 320 pt and spacing 32. Otherwise it gives one `VStack`, side sections after main.
- **Fixture.** `delivery.json` is the AC's screen (`fixtures/blocks/screen-side.json`). The look check and `blocks-shot --check` at 390 and 1440 should report no overlap or overflow.

## Files

`delivery.json` is the fixture. `delivery.html` and `rules.html` hold the screens as JSON and draw them with the real built renderer (`web/dist/blocks.js`). `side.js` is a preview-only port of the split, not product code. `side.css` is the proposed CSS, and `page.css` is the preview host only. Tokens come from `../neutral-default/tokens.css`. `./render.sh` makes the PNGs (Playwright's cached headless Chromium, light and dark, reduced motion). Nothing moves, so there is no clip.
