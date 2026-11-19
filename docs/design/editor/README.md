## Summary

Decision: the web draws `editor` the way the Swift app does, on #53's default look. It shows the text as numbered lines, starting at `first`. A line with an error gets a 3px brick marker and a brick number, with its message right under it. Tap or Enter opens a plain text box, checked 400 ms after typing stops. The check's errors are listed under the box.
Screens: a config file with two errors, read and editing, and a sheet of six states. Each is light and dark, at 1440 and 390.
Open questions: (1) Swift never leaves editing once opened. Should Escape or blur go back to the numbered view? I kept Swift's behaviour. (2) Swift drops an error whose line is not shown. I list it after the lines as "line N · message" so every field is drawn. Is that OK?

## Images

| Image | What it shows |
|---|---|
| `editor-light-1440.png`, `editor-dark-1440.png` | `fleet.toml` from line 12 in a settings page. Read view: a `--bg` box with a 1px `--edge` border, square, in a tile. Monospace text with line numbers in a muted 4ch gutter, 10px gap. Lines 15 and 20 have errors: a 3px `--r` inset marker on the left, the number in `--r`, and the message in `--r` 11px semibold text under the line, aligned to the text column. No tint and no fill. A long line wraps under its own text, never under the gutter. Below it, the same block while editing: a textarea (no gutter, as on Swift), at least 320px tall, with an ink border. The draft fixed line 15, so after the check only "line 20 · …" is listed under the box |
| `editor-light-390.png`, `editor-dark-390.png` | The same at phone width: the gutter stays, and lines wrap |
| `states-light-*.png`, `states-dark-*.png` | 1 the fixture (`notes` / `hello`). 2 `first: 40` and an error; when one line has two errors, the first wins (as on Swift). 3 an error on a line that is not shown, listed after the lines. 4 empty text still draws line 1. 5 keyboard focus: the read view is one button, "edit notes", with a 2px ink ring. 6 editing, with the errors listed by line |

## What impl builds

- `web/src/render/editor.ts` replaces `gap(43)` and draws from the generated `Editor`:
  - `text` becomes one `.edl` row per line: an `i` number and a `span` text. An empty line is drawn as a space.
  - `first` (default 1) offsets the numbers.
  - `errors` mark their line with `.err` and add a `p.ede` under it. When a line has two errors, the first wins. Errors off the excerpt go after the lines as `.ede.far`.
  - `name` is the textarea's `name` and its label, and the read view's "edit <name>".
  - `action` is posted as `{ [name]: draft }` 400 ms after the last keystroke, if the draft differs from `text`. Same as Swift's `check()`.
  - `id` goes through `render()`'s hooks. `gen/hooks.ts` gives `editor` no parts and no variant, so the root is `div.ed.b.b-editor[data-block=editor]`.
- Read view: the root is `role=button`, `tabindex=0`. A click or Enter or Space swaps the lines for the textarea and focuses it.
- The draft is kept per screen and block id, like the composer's, so a redraw with new `errors` keeps the text box and the cursor. Editing stays open as on Swift.
- CSS: `editor.css` here, 13 rules, tokens only. It goes into `web/src/blocks.css`. Budget: about 45 TS lines.
- `editor.js` is a preview-only port that draws these images, not product code. `page.css` stands in for #53's tiles (1px edge, 2px seam, dot grid), and the colours come from `../neutral-default/tokens.css`. Images: `./render.sh` (Playwright's cached headless Chromium, light and dark).
