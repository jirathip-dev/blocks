## Summary

Decision: a "playground" page on the site, linked in the nav beside "layout". It has a row of all 34 samples to start from (home plus the 33 kinds), then two panes. On the left is the screen's JSON in our own highlighted box, with JSON | Rust tabs, reset and share. On the right is the preview, drawn live by blocks.js, with its own look, light/dark and 390/1440 switches. Errors are marked at their line and the preview keeps the last good screen. Each gallery kind page's "The sample" tile gets the same Rust | JSON tabs and an "edit in the playground" link.
Screens: the playground; six of its states (not JSON, breaks the schema, Rust tab, shared, opened from a link, preview switches); a kind page (stat). Each at 1440 and 390.
Open questions: (1) Most gallery samples are built in `site/src/kinds.rs`, not `sample.rs` as the issue says: only lines, table, toast and timeline come from `sample.rs`. Should the Rust tab show whichever file builds the drawn sample (as drawn here), or should impl first move the site's samples into `sample.rs` so there is one source? (2) For home, the Rust is all of `home()` in `pages.rs`, which is long. I show a sentence and a link instead. OK?

## Images

| Image | What it shows |
|---|---|
| `playground-1440.png` | The page at 1440. It uses the site's nav, title and tiles; "playground" is the current nav link. **Start from**: one chips row of all 34 samples, home first, then the gallery's order, with the picked one filled. Two tiles at 5:7. **Edit**: a JSON \| Rust tab pair, then reset (off until something is edited) and ↗ share. A line saying where the text came from. The box: monospace 13/20, a muted line-number gutter and highlighting from the scheme's `--fk-*` tokens only (keys `--fk-c`, strings `--fk-g`, numbers `--fk-a`, true/false/null `--fk-p`, punctuation `--mute`). Under it, the status (`screen · 2 blocks · drawn`). **Preview**: its own look, light/dark and width switches, which use the same square, grey-edged button style as the site's look buttons, with the pressed one filled `--l`. The stage on `--bg` holds the screen at true width (390 here, actual size), with a caption under it |
| `playground-390.png` | The same at phone width. The chips wrap. The panes stack, edit above preview. The box is 16 rows tall and scrolls. 390 is shown at 83% to fit. The labels "look" drop |
| `states-1440.png`, `states-390.png` | **1 Not JSON**: a missing comma. The gutter number turns `--r`, bold, with a 3 px `--r` inset bar (as in the editor kind's design, `docs/design/editor`), and the token the parser stopped at gets a wavy `--r` underline. The message (`line 11 · not JSON: …`) sits under the box with the same bar. The preview shows a dashed "Showing the last good screen." note and keeps the last good draw. **2 Breaks the schema**: valid JSON with `"type": "stats"`. The same marks, the schema path and the nearest kind. **3 Rust tab**: read only, highlighted (keywords `--fk-p`, types `--fk-c`, macros `--fk-l` bold), numbered with the source's own line numbers, and headed by `file:from–to`, which links to those lines on GitHub. A sample with two blocks shows two snippets. **4 Shared**: share writes `#s=` + deflate-raw + base64url into the address, copies it and shows the link in a read-only field with "copied · N characters" in `--g`. **5 Opened from a link**: the screen comes back from the hash, "From a shared link.", no chip picked. The Rust tab says why it is empty, and reset goes back to a sample. **6 Preview switches**: Console, dark, 390 on the preview only, while the page stays Default and light |
| `kind-stat-1440.png`, `kind-stat-390.png` | The gallery's kind page. The site nav gains "playground". "The sample" tile now has Rust \| JSON tabs, Rust first, and "edit in the playground →" on the right. It replaces today's JSON listing and the bare link to `kinds.rs`. With JS off, both listings show one under the other |

## Decisions for impl

- The playground's text is always a whole `screen`: `{"type":"screen","id":"<kind>","blocks":[…the sample…]}`, pretty-printed by serde. The kind page's JSON tab shows the same string. Today it shows its blocks joined by newlines, which is not valid JSON when a kind has two samples. So blocks-site writes one string per sample, and the page and the playground both use it.
- Live redraw: on input, parse and check, then `render()` the screen into the preview frame's `main`. Only the preview changes, never the page. The preview is a same-origin `srcdoc` iframe set to the true width (390 or 1440) and scaled down to fit. It carries the picked look's tokens and `color-scheme`, so the switches never touch the page.
- Width default: 390 for a kind, 1440 for home.
- Links: `playground.html#k=<kind>` picks a sample (the kind pages and the picker use it). `#s=<packed>` is a shared screen. Share also writes it to the address with `history.replaceState`.
- The playground needs JS. With JS off, a `noscript` line points to the gallery.

## Files

- `playground.html`, `states.html`, `kind-stat.html`: the three screens. `kind-stat.html` is the real built page with only its sample tile and nav changed.
- `playground.css`: the new rules, tokens only. Impl moves them into `site/site.css`.
- `play.js`, `page.js`, `states.js`, `kind.js`: a preview-only port. It draws the preview with the real `web/dist/blocks.js` `render()`, so the mockup works when opened. It is not product code: impl writes the editor, the check (against the real schema) and the packing in `web/src`.
- `build.mjs`: builds the real site into a temp folder, then writes `site.css`, `tokens.css`, `samples.js` (every sample's JSON, and its Rust cut from the source) and `kind-stat.html`. Its Rust cutter is a rough stand-in; impl needs an exact cut and the test that fails when a cut no longer matches the source.
- `render.sh`: runs `build.mjs`, then shoots each page at 1440 and 390 with Playwright's cached headless Chromium.
