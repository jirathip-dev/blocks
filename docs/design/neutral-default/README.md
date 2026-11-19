## Summary

Decision: blocks' built-in default is the neutral grey pair as drawn (ink is the only accent, links are ink and underlined), plus a tile look: every block is a square-cornered tile, with a 2 px seam where the page shows through and a faint dot grid on the page. On first load a screen's tiles settle in one by one, all done by 360 ms, once; reduced motion keeps the page still.
Screens: the core kinds as tiles (light and dark), the build-up storyboard with a late block's entry, and the token table (19 colours and 12 style values). Each at 1440 and 390.
Open questions: a block that arrives later is my proposal: it fades in where it lands over 160 ms with no rise, and the blocks below it step down at once. Is that right, or should they slide?

## Images

| Image | What it shows |
|---|---|
| `kinds-light-1440.png`, `kinds-light-390.png` | Light: every block is a white square tile with a 1 px `--edge` outline. Tiles in a group sit 2 px apart and the grey page shows through the seam. Rows, stats and tones are one tile each, not dividers inside one card. Section labels and the dot grid sit on the page. Buttons, fields, chips, status dots and toggles are square too |
| `kinds-dark-1440.png`, `kinds-dark-390.png` | Dark: the same tiles. The seam and dots use the dark page and `--edge`, so the grid stays faint |
| `storyboard-1440.png`, `storyboard-390.png` | The build-up as five frames (0, 90, 180, 270, 360 ms) from the real page at 390 wide, and a late block's entry as three frames (0, 80, 160 ms). The rules are listed under the frames |
| `tokens-1440.png`, `tokens-390.png` | The 19 colours for both modes (unchanged), then the style values. The built default must match them exactly |

## The build-up

- Only the tiles on the first screen take part, in reading order: top to bottom, then left to right. A tile below the fold is simply there.
- Each tile fades from 0 to 1 and rises 8 px over 160 ms, ease-out. Move and fade only.
- The step between starts is the smaller of 40 ms and 200 ms divided by (tiles on screen − 1). The last tile starts by 200 ms and lands by 360 ms, whatever the count: 11 tiles at 390 (step 20 ms), 25 at 1440 (step 8 ms).
- It plays once per screen load. The content is in the page HTML from the first paint; a static page plays the build-up itself, and the takeover keeps the same tiles and does not play it again, so there is no flash.
- Reduced motion: no build-up, no fade.
- Both renderers can draw it from simple shapes: an opacity and a y offset per tile, a delay from its index. SwiftUI orders tiles by the layout's slot frames.

## A block that arrives later (proposal)

It takes its place at once, so the tiles below step down without motion, and it fades in over 160 ms with no rise. Several blocks in one update fade together, with no stagger. A removed block goes at once; a block whose content changes does not animate. Reduced motion: it simply appears.

## Style values

| Token | Value | Used for |
|---|---|---|
| `--radius` | `0px` | tile, button, field and chip corners |
| `--seam` | `2px` | gap between tiles, where the page shows through |
| tile edge | `1px` of `--edge` | each tile's outline, so the seam reads in light mode |
| `--dot-size` | `2px` | grid dot, a square |
| `--dot-gap` | `16px` | dot spacing; page padding and section gaps are multiples of it |
| `--dot` | `--edge` | dot colour, so there is no 20th colour |
| `--settle` | `160ms` | one tile's build-up |
| `--rise` | `8px` | how far a tile rises as it settles |
| `--stagger` | `40ms` | most time between two tiles' starts |
| `--build` | `200ms` | latest start of the last tile |
| `--enter` | `160ms` | a later block's fade |
| `--ease` | `cubic-bezier(0.2, 0, 0, 1)` | ease-out for both motions |

`default-style.json` holds these values. They are the same in light and dark.

## The 19 colours

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#f6f6f6` | `#161616` |
| `--card` | `#ffffff` | `#1f1f1f` |
| `--edge` | `#d0d0d0` | `#3a3a3a` |
| `--line` | `#e4e4e4` | `#2a2a2a` |
| `--scrim` | `#0000004d` | `#00000099` |
| `--fg` | `#1c1c1c` | `#ececec` |
| `--mute` | `#5e5e5e` | `#a3a3a3` |
| `--l` | `#3d3d3d` | `#d6d6d6` |
| `--link` | `#3d3d3d` | `#d6d6d6` |
| `--g` | `#2f8a3e` | `#4fb860` |
| `--a` | `#a86f00` | `#d9a23a` |
| `--r` | `#c62828` | `#f06a6a` |
| `--p` | `#7a52b3` | `#b393e6` |
| `--c` | `#1f7a85` | `#4fb8c4` |
| `--fk-l` | `#3d3d3d` | `#d6d6d6` |
| `--fk-p` | `#6a45a0` | `#b8a0e8` |
| `--fk-c` | `#17656e` | `#6cc6d0` |
| `--fk-g` | `#23702f` | `#6cc77a` |
| `--fk-a` | `#855400` | `#e0b25a` |

`default-light.json` and `default-dark.json` hold these values as two `Scheme` files, in the same format as `theme/schemes/*.json`. Impl copies them as they are.

## Gate

I checked both schemes against a port of `theme::gate`; the real gate must pass them in CI. Both pass. The checks closest to their limits:

- light: `--mute` on the needs-you card 4.75 (min 4.5), `--a` on the amber header 3.42 (min 3), `--a` on `--bg` 3.93 (min 3)
- dark: `--mute` on the needs-you card 5.86 (min 4.5), ΔE2000 `--l` to `--a` 27.9 (min 20)

None of the 38 values is in any of the 12 named schemes.

## Files

`tokens.css` sets the pair the way `theme::css` writes it (light on `:root`, dark under `prefers-color-scheme: dark`), then the style values. `page.css` and `build.js` are used only by these mockups; the HTML and SwiftUI renderers draw the tiles in their own issue. `build.js` runs the build-up; `?t=<ms>` holds the page at that moment, and `?late=<ms>` shows a late row at that moment of its fade. The storyboard frames are `frame-*.png` and `late-*.png`, rendered from `kinds.html` at 390 by 844. The dark images were rendered with Chrome headless shell and `--blink-settings=preferredColorScheme=0`. There is no clip: the host's ffmpeg cannot write a GIF, and the storyboard shows each moment.
