## Summary

Decision: blocks' built-in default is the tile design as drawn at 8d422c1 (neutral greys, ink links, square tiles, 2 px seams, faint dot grid, a build-up that ends by 360 ms), with the five state and tone colours muted together (brick red, moss green, ochre, dusty purple, slate teal) and used small: markers and text only, no tinted headers or cards, no coloured fill on a control.
Screens: the core kinds as tiles (light and dark), the build-up storyboard with a late block's entry, and the token table (19 colours and 12 style values). Each at 1440 and 390.
Open questions: none. The muted set passes the gate's distance rule in both modes. The late-block entry is still my proposal as before: a fade in place over 160 ms with no rise.

## Images

| Image | What it shows |
|---|---|
| `kinds-light-1440.png`, `kinds-light-390.png` | Light: every block is a white square tile with a 1 px `--edge` outline. Tiles in a group sit 2 px apart and the grey page shows through the seam. Rows, stats and tones are one tile each, not dividers inside one card. Section labels and the dot grid sit on the page. Buttons, fields, chips, status dots and toggles are square too. The state colours show only as small squares, text and a 3 to 4 px edge marker; every surface stays grey |
| `kinds-dark-1440.png`, `kinds-dark-390.png` | Dark: the same tiles. The seam and dots use the dark page and `--edge`, so the grid stays faint |
| `storyboard-1440.png`, `storyboard-390.png` | The build-up as five frames (0, 90, 180, 270, 360 ms) from the real page at 390 wide, and a late block's entry as three frames (0, 80, 160 ms). The rules are listed under the frames |
| `tokens-1440.png`, `tokens-390.png` | The 19 colours for both modes (greys and ink unchanged, the five state and tone colours muted), then the style values. The built default must match them exactly |

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

## How the state colours are used

They are muted together (brick red `--r`, moss green `--g`, ochre `--a`, dusty purple `--p`, slate teal `--c`, each with its text shade) and drawn small, so none stands out on the grey:

- Group headers are plain tiles: a small square marker and the label in the state's text colour. No tinted background.
- The needs-you card is a plain tile with a 4 px brick-red edge marker (like the ink selection marker) and a small "Needs you" label in brick red. No tint, no red outline.
- Chips have a grey edge, a 6 px square marker and the label in the tone's text colour.
- The destructive button keeps a grey edge and takes brick-red text. No control has a coloured fill; ink is still the only fill.
- A field in error keeps its grey edge, takes a 3 px brick-red edge marker and a brick-red hint below.
- Status dots, tone markers and stat deltas are 8 px squares or text.

The gate still measures the tinted needs-you card and group headers; the values pass those too, so a renderer that draws them is not broken by this pair.

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
| `--g` | `#649163` | `#4d7a4d` |
| `--a` | `#9d7e4c` | `#8e703f` |
| `--r` | `#9e5855` | `#c27773` |
| `--p` | `#927ea6` | `#7b688e` |
| `--c` | `#4690a0` | `#2d7a8a` |
| `--fk-l` | `#3d3d3d` | `#d6d6d6` |
| `--fk-p` | `#78658c` | `#9784ac` |
| `--fk-c` | `#267585` | `#4c96a6` |
| `--fk-g` | `#537452` | `#729471` |
| `--fk-a` | `#816945` | `#a18862` |

`default-light.json` and `default-dark.json` hold these values as two `Scheme` files, in the same format as `theme/schemes/*.json`. Impl copies them as they are.

## Gate

I checked both schemes against a port of `theme::gate`; the real gate must pass them in CI. Both pass with no miss. The checks closest to their limits:

- light: `--a` on the amber header tint 3.10 (min 3), `--fk-a` and `--fk-p` on `--bg` 4.81 (min 4.5), ΔE2000 `--g` to `--a` 23.5 and `--a` to `--r` 24.2 (min 20)
- dark: `--fk-g` on `--card` 4.86 (min 4.5), `--g` on `--card` 3.3 (min 3), ΔE2000 `--g` to `--a` 23.7 and `--a` to `--r` 24.0 (min 20)

`--r` is used as text, so it is held at 4.8:1 or more on both surfaces in both modes, above the gate's 3:1. The muted colours have a CIE chroma of 32 (`--r`, `--g`, `--a`) and 24 (`--p`, `--c` and the text shades), against 47 to 73 before for all but the old cyan.

None of the 38 values is in any of the 12 named schemes.

## Files

`tokens.css` sets the pair the way `theme::css` writes it (light on `:root`, dark under `prefers-color-scheme: dark`), then the style values. `page.css` and `build.js` are used only by these mockups; the HTML and SwiftUI renderers draw the tiles in their own issue. `build.js` runs the build-up; `?t=<ms>` holds the page at that moment, and `?late=<ms>` shows a late row at that moment of its fade. The storyboard frames are `frame-*.png` and `late-*.png`, rendered from `kinds.html` at 390 by 844. The dark images were rendered with Chrome headless shell and `--blink-settings=preferredColorScheme=0`. There is no clip: the host's ffmpeg cannot write a GIF, and the storyboard shows each moment.
