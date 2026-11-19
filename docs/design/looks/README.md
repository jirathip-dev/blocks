## Summary

Decision: the four looks redrawn to your notes, every axis pushed to its extreme. Default stays exactly as today. Console is square, mono, dense and borderless (no dashed edges). Paper is serif and airy, with hairline rules. Playful has a clean white base, big round corners, soft grey fills instead of borders, a black pill for the main action and a bright accent per item (purple, blue, green, orange, pink). It has no glass and no violet. Card padding now grows and shrinks with each look's spacing, so nothing touches a card edge. All eight light and dark schemes pass the contrast gate.
Screens: home in each look, light and dark; the gallery in each look; the Styles page in each look. Each is drawn at 1440 and 390 wide.
Open questions: the per-item accents (Playful), the white secondary pills (Playful) and the hairline rows (Paper) are site styling for that look, not a token. Keep them in the site's CSS (recommended), or name a new style value so any app can have them?

## Images

| Image | What it shows |
|---|---|
| `home-default-{light,dark}-{1440,390}.png` | Default, unchanged: byte-identical to today's staging render |
| `home-console-{light,dark}-{1440,390}.png` | Console: mono type, space ×0.5 (dense), radius 0 (square), no motion. Borderless: cards are set apart from the page by fill alone, because the edge token equals the card colour. Outlined picked chip, `[button]` labels and `// section` headers in lower case |
| `home-paper-{light,dark}-{1440,390}.png` | Paper: serif type, space ×2 (airy), 3 px corners, a calm ×1.75 motion. Hairlines: 1 px card edges, and list rows split by thin rules instead of boxed tiles. Quiet upper-case section headers, state marks as words |
| `home-playful-{light,dark}-{1440,390}.png` | Playful: white page, grey-filled cards with no borders, 24 px corners, so buttons and chips are pills. A black pill for the primary action (white in dark), with white pills for the rest. Each item gets its own bright accent: the four stat numbers and a round avatar dot on each *Look around* row, cycling purple, blue, green, orange, pink |
| `gallery-{look}-light-{1440,390}.png` | All 33 kinds in each look, top of the page. Every kind follows the look through the tokens and style, with no per-kind work. In Playful each kind's card gets the next avatar colour |
| `styles-{look}-light-{1440,390}.png` | The Styles page as #142 built it (the page and the switcher are unchanged), wearing each look. The space fix shows here: each sample panel's inner padding is 16 px × space with a 10 px floor, and each row's inset is 12 px × space with an 8 px floor. At Console's ×0.5 no row touches the panel edge, and at Paper's ×2 nothing clips at 390 |

## Values (`proposal/looks.json`)

| Axis | Default | Paper | Console | Playful |
|---|---|---|---|---|
| type | default | serif | mono | default |
| space | 1 | 2 | 0.5 | 1.25 |
| radius | 0 | 0.25 (3 px) | 0 | 2 (24 px) |
| motion · easing | 1 · standard | 1.75 · calm | 0 · standard | 1.25 · bouncy |
| surface | solid | solid | solid | solid |
| fills | tint | tint | outline | solid |
| marks | symbols | text | text | symbols |
| sections | title | quiet | title | title |
| labels | as is | header upper | header `// ` lower, button `[ ]` lower | as is |

- **All four surfaces are `solid`** (an opaque card with an edge in `--edge`, in both the web and SwiftUI renderers). The look comes from the edge token. Console and Playful set `--edge` to the card colour, so cards are borderless. Paper sets a light hairline colour. This drops Console's `dashed` and Playful's `glass`.
- **Playful accents.** `--p`, `--c`, `--g`, `--a` and `--r` are purple, blue, green, orange and pink, deep enough that white text reads on each (solid fills need 4.5:1 against the page). `--l` is near-black in light and near-white in dark, so the primary action is a black or white pill.
- **No new crate values.** Everything uses the Style axes #220–#223 added (`Serif`, `Fills::Solid`, easing).

## Files

- `proposal/looks.json` and `proposal/site.css` are the proposed `site/looks.json` and `site/site.css`. Impl copies them over (site.css: +25 / −6 lines).
- `site.css` changes. The space fix: `--sp` gets a 10 px floor, and a new `--in` (12 px × space, 8 px floor) replaces the five hard-coded `12px × space` insets. Both resolve to today's values at space 1, so Default is unchanged. Then come the Playful and Paper rules from the open question, each scoped to `html[data-look=…]`.
- `render.sh` copies HEAD to a temp folder and swaps in the two proposal files. It builds the real site there; that build runs the real `theme::gate` on all eight schemes and stops on a miss. It then writes `home-`, `gallery-` and `styles-<look>.html`, each pre-set to its look, and renders the PNGs with Playwright's headless Chromium (reduced motion, light or dark by the device setting).
- `blocks.css`, `blocks.js`, `site.css` and `media/` come from that build, so the pages open on their own.
