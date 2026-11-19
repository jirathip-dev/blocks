## Summary

Decision: each look now has its own page colour, palette, hero art and card style. Default stays exactly as today. Console is a terminal: a near-black page with off-white mono text and one amber accent (paper-white with black ink in light). It has no cards, only rules, and its hero is the page drawn in amber box characters with a `$ blocks new screen` prompt, the tree it prints and a blinking cursor. Paper is a book: a warm cream page (brown-black in dark) with near-black ink and one deep red accent. It has a drop-cap title, an ink line drawing of the page as hero and one narrow centred column split by hairlines and ❦. Playful keeps your white, round, grey-filled base with the black pill and per-item brights. It adds stickers: tilted rounded tiles with icons and soft shadows as hero, and cards slightly turned. The hero art, rules, ornaments and stickers are site-only CSS. The tokens carry palette, font, corners and spacing. Playful's blank 4th switcher button is fixed. All eight schemes pass the contrast gate.
Screens: home in each look, light and dark; the gallery in each look; the Styles page in each look. Each is drawn at 1440 and 390 wide.
Open questions: none.

## Images

| Image | What it shows |
|---|---|
| `home-default-{light,dark}-{1440,390}.png` | Default, unchanged: byte-identical to today's staging render |
| `home-console-{light,dark}-{1440,390}.png` | Console (q2415, q2416): near-black page (`#0d0d0c`), off-white mono text, amber (`--a`) as the one accent on the `>` title mark, stat numbers, section headers and hero. Light is paper-white with black ink. No grey cards, only 1 px rules between blocks and rows. The hero art is the home page drawn in amber box characters, then `$ blocks new screen   # this page is one too`, the screen tree it prints and a blinking amber cursor (steady under reduced motion). Primary action is ink-inverse (off-white fill in dark, black in light) |
| `home-paper-{light,dark}-{1440,390}.png` | Paper (q2417, q2418): warm cream page (`#f4ecdc`) with near-black ink, and warm brown-black (`#1e1812`) with cream text in dark. The one accent is deep red (`--r`), used on the drop-cap **b** and the ❦ ornaments. One narrow centred column (680 px), no cards. Blocks are split by hairlines with a ❦ on each. The hero is a hand-drawn ink line drawing of the screen, drawn in the ink token, so it turns cream in dark. Stats sit in a 2 × 2 grid ruled by hairlines |
| `home-playful-{light,dark}-{1440,390}.png` | Playful (q2358, q2419): white page with no dot grid, grey-filled cards with no borders, 24 px corners, a black pill for the primary action (white in dark) and per-item brights (stats, avatar dots). Stickers: the hero is six tilted rounded tiles (purple, blue, green, orange, pink, yellow) with white icons and soft shadows. Top-level cards turn slightly (−0.6°, +0.7°, −1.2°) with a soft shadow. The look switcher's Playful button now shows (black pill, white text) |
| `gallery-{look}-light-{1440,390}.png` | All 33 kinds in each look. Console: each kind under a rule, with no frames. Paper: one column, kinds split by hairlines, each sample in a solid hairline frame (no dashed edges anywhere). Playful: kind cards turned like stickers, with the samples inside them kept straight so nothing clips |
| `styles-{look}-light-{1440,390}.png` | The Styles page as #142 built it, wearing each look. Its sample panels show the new Console and Paper palettes (this is the only change to `styles-default`). The space fix from the first draft stays: panel padding is 16 px × space (10 px floor), and row inset is 12 px × space (8 px floor) |

## Values (`proposal/looks.json`)

| Axis | Default | Paper | Console | Playful |
|---|---|---|---|---|
| page · ink · accent (light) | as today | `#f4ecdc` · `#1d1a16` · red `#9b1c1c` | `#fbfaf6` · `#111111` · amber `#a35f00` | `#ffffff` · `#111114` · per item |
| page · ink · accent (dark) | as today | `#1e1812` · `#efe4cc` · red `#e8705c` | `#0d0d0c` · `#e9e5d6` · amber `#ffb000` | `#0e0e11` · `#f4f4f7` · per item |
| type | default | serif | mono | default |
| space | 1 | 2 | 0.5 | 1.25 |
| radius | 0 | 0 | 0 | 2 (24 px) |
| motion · easing | 1 · standard | 1.75 · calm | 0 · standard | 1.25 · bouncy |
| surface | solid | solid | solid | solid |
| fills | tint | tint | outline | solid |
| marks | symbols | text | text | symbols |
| sections | title | quiet | title | title |
| labels | as is | header upper | header `// ` lower, button `[ ]` lower | as is |

- **One accent each, inside the gate.** The gate requires the action colour (`--l`, `--link`) to differ from green, amber and red by ΔE 20 or more. So Console's amber lives in `--a` and Paper's red in `--r`, and both looks use ink for actions and links. Their other hues (`--p`, `--c`) are muted greys, so the accent is the only colour on the page.
- **Cards are site CSS, not a surface value.** In Console and Paper, `--card` equals `--bg`, and the site CSS swaps card boxes for rules and hairlines. Paper's radius drops from 0.25 to 0, square as a book page.
- **No new crate values.** Everything uses the Style axes #220–#223 added.

## Files

- `proposal/looks.json`, `proposal/site.css` and `proposal/media/` (two hero drawings: `hero-paper.svg`, `hero-playful.svg`) are the proposed `site/looks.json`, `site/site.css` and new `site/media/` files. Impl copies them over. All the look-only rules are scoped to `html[data-look=…]`, so Default is untouched.
- `site.css` changes. The space fix: `--sp` gets a 10 px floor, and a new `--in` (12 px × space, 8 px floor) replaces the five hard-coded `12px × space` insets. Both resolve to today's values at space 1, so Default is unchanged. Then come the per-look showcase rules (hero art, rules, ornaments, stickers), each scoped to `html[data-look=…]`.
- `render.sh` copies HEAD to a temp folder and swaps in the proposal files. It builds the real site there; that build runs the real `theme::gate` on all eight schemes and stops on a miss. It then writes `home-`, `gallery-` and `styles-<look>.html`, each pre-set to its look, and renders the PNGs with Playwright's headless Chromium (reduced motion, light or dark by the device setting).
- `blocks.css`, `blocks.js`, `site.css` and `media/` come from that build, so the pages open on their own.
