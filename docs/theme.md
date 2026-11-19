# Theme: the built-in default

blocks holds the theme rules (the 19 colour tokens, the gate, `css`) and one neutral default of its own. A server
or app with a theme hands its schemes and style to the renderers; the default is what paints when none is supplied:
blocks' own tests and fixtures, the headless PNGs, the showcase site and an app's first paint before its server
answers. Apps with their own style are unaffected.

## The pair

`theme::default()` is a `PerMode<Scheme>`: `Default light` and `Default dark`, plain greys made for blocks, with ink
as the only accent (links are ink, underlined). The five state and tone colours are muted together (brick red, moss
green, ochre, dusty purple, slate teal) and are used small, as markers and text only: no tinted headers or cards,
no coloured fill or edge on a control. Both schemes pass `gate`, and none of their 38 values is taken from a named
scheme. The values are the approved design's, in `docs/design/neutral-default/` (`default-light.json`,
`default-dark.json`); a test holds the built pair to those files.

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#f6f6f6` | `#161616` |
| `--card` | `#ffffff` | `#1f1f1f` |
| `--edge` | `#d0d0d0` | `#3a3a3a` |
| `--line` | `#e4e4e4` | `#2a2a2a` |
| `--scrim` | `#0000004d` | `#00000099` |
| `--fg` | `#1c1c1c` | `#ececec` |
| `--mute` | `#5e5e5e` | `#a3a3a3` |
| `--l`, `--link`, `--fk-l` | `#3d3d3d` | `#d6d6d6` |
| `--g` | `#547850` | `#769672` |
| `--a` | `#927236` | `#c5a370` |
| `--r` | `#a75953` | `#bb776e` |
| `--p` | `#74678e` | `#a295bb` |
| `--c` | `#3c797d` | `#6da1a5` |
| `--fk-p` | `#64597c` | `#b8abce` |
| `--fk-c` | `#31666a` | `#8ab9bc` |
| `--fk-g` | `#456642` | `#9bb996` |
| `--fk-a` | `#775d2c` | `#d1b184` |

## The tile style

`theme::DEFAULT_STYLE` holds the default's style values as CSS variables, the same in both modes: square corners
(`--radius: 0px`), a `--seam` of `2px` between tiles where the page shows through, a faint dot grid on the page
(`--dot-size: 2px`, `--dot-gap: 16px`, `--dot: var(--edge)`), and the motion: a screen's first-load build-up where
its tiles settle in one by one (`--settle: 160ms`, `--rise: 8px`, `--stagger: 40ms`, `--build: 200ms`, so it is
over by 360 ms, once, move and fade only, still under reduced motion) and a block that arrives later fading in
where it lands with no rise while the blocks below step down at once (`--enter: 160ms`), all on
`--ease: cubic-bezier(0.2, 0, 0, 1)`. style.json's optional `easing` picks that curve: `standard` (the default, the
curve above), `calm` (`cubic-bezier(0.4, 0, 0.2, 1)`) or `bouncy` (`cubic-bezier(0.34, 1.3, 0.64, 1)`, at most 3%
past its end, so a rise of 8px overshoots by under a pixel); format 1 and 2 files without it read as `standard`.

Both renderers draw them. HTML: `theme::css` writes the style values on `:root`, the shell and `blocks-shot` write them
under `:where(:root)` so any app rule wins, and `blocks.css` reads only the variables; the shell plays the build-up once
per screen (not on an update, a tab switch back, a resync or a site page's takeover), and `--motion: 0` or reduced
motion turns it off. SwiftUI: `Look.tiles` (default `Tiles.default`, parsed from `blocksDefaultStyle`) draws every
surface as a tile on the dot grid; `tiles: nil` gives the app's own `Style` back, and a still look, a `motion` of 0 or
reduced motion turns the build-up off. `fixtures/look/kinds.json` is the kinds page both harnesses draw to one tree.

## Generated

`just gen` writes the pair and the style values: `defaultPair` and `defaultStyle` in
`web/src/gen/schemes.ts`, `blocksDefaultLight`, `blocksDefaultDark` and `blocksDefaultStyle` in
`swift/Sources/Blocks/Gen/Schemes.swift`, so a page and the Swift app can paint before a server answers. In
SwiftUI, `Palette.defaultLight` and `Palette.defaultDark` are the pair, and a `Look` starts on `defaultDark`.
The headless harness (`blocks-shot`) paints every run on the pair, light or dark by the page's appearance, under
any `--css` it is given.

## Named schemes and packs

blocks holds no named scheme and no pack (q2115): every one lives in swag's crate, which an app pins beside blocks.
The app parses swag's scheme text as `Scheme` and gates it, and checks each pack with `check_pack(files, schemes)`,
handing it the schemes the pack may name. The web shell's look sheet lists the schemes the app passes to `mount`
as `schemes`, and none when it passes none. Here `fixtures/packs/plain` (naming `default-dark` and `default-light`)
keeps `check_pack` and the `Theme` port tested.
