## Summary

Decision: the web draws `web` like the Swift app: the page in a box at the block's `height`, full width, in a locked-down (sandboxed) frame with no cookies or storage, no access to the host page and no camera, microphone or location. Two additions to Swift: a muted caption under the frame with the address and "open ↗", and a frame capped at 80% of the window height. A `src` that is not http or https draws a muted "can't be shown" box at the same height.
Screens: the block in a screen, and a sheet of its states (drawn, loading, refused, not shown, a long address and a tall page, the frame's settings). Each is drawn light and dark, at 1440 and 390.
Open questions: (1) Should we keep the caption? Swift has none, but the caption is the only way out when a site refuses to be framed. (2) Swift draws nothing for a relative `src` such as the fixture's `/doc`. The web reads it against the page's address. Should Swift do the same, or should the web draw nothing too? (3) Can embedded pages run their own scripts? The design says yes, inside the sandbox. Say no if they should be static.

## Images

| Image | What it shows |
|---|---|
| `web-light-1440.png`, `web-dark-1440.png` | A cooee update screen: a header tile, three stats, then the "What's new" tile with the embedded release notes at the fixture's 240 px, and a row below it. The frame is a square box with a 1px `--edge` line. The embedded page keeps its own look, so it stays light in dark mode. Under it is the muted caption `cooee.app/doc` with "open ↗" (ink, underlined) |
| `web-light-390.png`, `web-dark-390.png` | The same at phone width. The frame keeps its height and fills the tile's width. The page inside scrolls on its own |
| `states-light-*.png`, `states-dark-*.png` | 1 drawn. 2 loading: the box shows `--bg` at the full height, with no spinner and no layout shift. 3 refused: the browser's own error page shows (the renderer can't detect this), and "open ↗" is the way out. 4 not shown: a `javascript:`/`data:`/unreadable `src` draws a muted box with "This page can't be shown here." and no frame or link. 5 a long address is cut with "…", and a 1400 px frame is held to 80% of the window. 6 the frame's attributes |

## What impl builds

- `web/src/render/web.ts` replaces `gap(41)`: a `div` root (the block hooks: `b b-web`, `data-block`, `data-id`; `web` has no parts or variant in `gen/hooks.ts`). It holds `iframe.wf` and `div.wm`, which holds `span.wu` (the address) and the "open ↗" link made with `href()` (new tab, `noopener`).
- Fields: `src` sets the frame's address, the caption and the link. `height` sets the frame's height in px. `id` goes on the root, and `show` stays the renderer's.
- `src` is read with `new URL(src, document.baseURI)`, as `images.ts` does. Only `http:` and `https:` give a frame. Anything else, or a parse error, gives `div.wf.none` at the same height with the muted text. (The preview also accepts `file:`, only so these pages load from disk.)
- The frame: `sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"` (no `allow-same-origin`, no top navigation), `allow=""`, `referrerpolicy="no-referrer"`, `loading="lazy"` and `title` set to the address. No script is added to the host page. A redraw with the same `src` keeps the frame, so it does not reload.
- CSS: `web.css` here, five rules on the tokens only (square, `--edge`, `--bg`, `--mute`, `--fs-meta`, `--ctl`), added to `web/src/blocks.css`. Budget: about 30 TS lines.
- The static writer `site/web.rs` (B8) writes the same element where it exists.
- Preview-only files: `web.js` (what the renderer draws), `doc.html` (a stand-in page to embed), `refused.html` (a stand-in for the browser's error page) and `page.css` (the host page, as in `docs/design/diagram`, plus a 640 px cap standing in for 80svh in an 800 px window). Images: `./render.sh` (Playwright's cached headless Chromium, light and dark, reduced motion).
