## Summary

Decision: the web draws `diff` like the Swift app (file name, summary on the right, each `@@` line, then the lines), on #53's default look: a code box on the page grey, context lines muted, added and removed lines in ink with a 3px moss or brick marker and a coloured `+`/`−` sign. Unlike Swift, there is no tinted line background, since #53 allows no tinted surfaces. Long lines scroll sideways instead of wrapping.
Screens: a change under review with two files, and a sheet of every case (fixture, summary, several hunks, long line, long path, deleted file, no hunks, fallback). Each is drawn light and dark, at 1440 and 390.
Open questions: (1) Is dropping Swift's tinted line background right for the web? If so, should Swift follow later, in its own issue? (2) There are no line numbers, because the type carries none and Swift shows none. Leave them out? (3) Long hunks are drawn in full, with no "show more". Is that fine for now?

## Images

| Image | What it shows |
|---|---|
| `diff-light-1440.png`, `diff-dark-1440.png` | Two `diff` blocks, each in its own square tile (1px `--edge`, 2px seam, dot-grid page). The header shows the file in semibold mono, with the summary (`+2 −2`, `new file · +29`) muted on the right. Below it is the code box: `--bg` fill with a 1px `--line` outline, 12px mono, 18px rows. Each `@@` line is in ink (`--link`), with a hairline between hunks. Context lines are `--mute`. An added line is `--fg` with a 3px `--g` inset marker and a bold `--fk-g` `+`. A removed line is `--fg` with a 3px `--r` marker and a bold `--r` `−`. Nothing is tinted |
| `diff-light-390.png`, `diff-dark-390.png` | The same at phone width. The header stays put. The code box scrolls sideways as one block, and the markers run the full scrolled width |
| `states-light-*.png`, `states-dark-*.png` | 1 `fixtures/blocks/diff.json` as is. 2 summary and context. 3 several hunks. 4 a long line: sideways scroll, no wrap. 5 a long path wraps anywhere, and the summary drops under it. 6 a deleted file; a `\ No newline` note, or any line not starting with `+` or `-`, draws as context. 7 no hunks: only the header, with no empty box. 8 a block that does not read as a diff draws its fallback row, as the gap does today |

## What impl builds

- `web/src/render/diff.ts` replaces `gap(42)` and reads the generated `Diff`/`Hunk`. It draws every field: `file`, `summary` when present, and each hunk's `at` and `lines`. `id` and `show` go through `render`'s common handling, as for every kind. The DOM is a `div.df` (`role=group`, `aria-label` set to the file), with `.b.b-diff` and `data-block="diff"` added by `render`. Inside it: `.dfh` holds `.dff` (file) and `.dfs` (summary); `.dfb` (code box, only when there are hunks) holds `.dfk` (an `@@` line) and `.dfl.add|.del|.ctx` lines. Each line is an `i.dfm` sign plus its text. `hooks.ts` gives `diff` no variant and no parts, so the root's names are all there is to carry.
- No JS measuring: the box is a one-column grid (`minmax(100%, max-content)`), so changed-line markers span the scrolled width on a static page too. `site/diff.rs` (B8), when it exists, writes the same element.
- The CSS is `diff.css` here: 13 rules, tokens only, square corners. It goes into `web/src/blocks.css`. Its one new value is a monospace font stack (`ui-monospace, SFMono-Regular, Menlo, monospace`), which Swift also uses as `.monospaced`. Budget: about 25 TS lines.
- `diff.js` is a preview-only port that draws these images; it is not product code. `page.css` stands in for #53's tile host on these previews only, and colours come from `../neutral-default/tokens.css`. Images: `./render.sh` (Playwright's cached headless Chromium, light and dark).
