## Summary

Decision: a look switcher sits at the right of the nav on every page (four named buttons, its own full-width row on a phone) and restyles the page in place; the four looks are Default (today's tiles, unchanged), Paper (serif, roomy, soft corners, calm), Console (mono, dense, square, dashed, still) and Playful (round, bold solid fills, glass cards, a small overshoot), each a light and a dark scheme that follow the device and pass the contrast gate. A new Styles page replaces the schemes page in the nav: one sample per axis, drawn in all four looks side by side, ending with "Bring your own".
Screens: home (each look, light and dark), gallery (each look), Styles (Default light, Console dark); each at 1440 and 390.
Open questions: today the web renderer draws only the motion setting; the other axes never reach the page, and three values don't exist yet. Should the orchestrator file the four crate issues below and block impl on them (recommended), or should impl ship colour and motion first?

## Images

| Image | What it shows |
|---|---|
| `home-default-{light,dark}-{1440,390}.png` | Default looks exactly as today. The only change is the switcher in the nav (Default pressed, ink-filled) and *styles* in place of *schemes* |
| `home-paper-{light,dark}-{1440,390}.png` | Paper: serif type, 1.5× space (24 px padding, 8 px gaps between tiles), 6 px corners, tinted primary action, quiet upper-case section headers. Dark is a new warm pair |
| `home-console-{light,dark}-{1440,390}.png` | Console: mono type, 0.75× space, square corners, dashed tile edges, outlined primary, buttons as `[label]`, sections as `// label` in lower case, no motion. The accent is steel blue, not green, so it stays clear of the "good" state colour (the gate's colour-distance check) |
| `home-playful-{light,dark}-{1440,390}.png` | Playful: heavy sans headings, 1.25× space, 18 px corners with pill buttons, solid accent fills, glass cards (translucent, soft shadow), violet pair |
| `gallery-{look}-light-{1440,390}.png` | All 30 kinds in each look, cropped to the first screens. Every kind follows the look, with no per-kind work: radius, surface, fills and marks reach rows, cards, chips, tags and state marks |
| `styles-default-light-{1440,390}.png` | The Styles page: an intro, then one section per axis (colour, type, space, radius, motion, surface, fills, marks, sections, labels). Each has one line on what the axis does, then four cells, one per look, each with its value. The look being worn is marked *wearing*; values the crate lacks today are marked *is new*. Motion is drawn as three frames with its numbers, since an image can't move. Four across at 1440, two by two at 390 |
| `styles-console-dark-{1440,390}.png` | The same page wearing Console on a dark device: the page changes, the four cells stay pinned to their looks |

## Decisions

- **Switcher.** It sits in the nav because the nav is on every page: a *look* label, then four buttons, each with a small swatch in that look's accent and corner shape. Pressed shows the current look. Picking one swaps the look's CSS variables with no reload, and is remembered (the shell's existing `b:look` store) so it holds across pages. It never chooses light or dark: the device does. With JS off the switcher is hidden and the page wears Default.
- **Schemes merge into Styles.** Colour is one axis of ten, so the schemes page's content (the pairs, *Bring your own*, the JSON) becomes the Styles page's first and last sections. The schemes page and its *look* sheet button go away, so there is one place to pick a look, not two.
- **Looks are the site's own.** They are defined in `site/` beside Paper today. The crate's built-in default pair and its `DEFAULT_STYLE` are unchanged; Default here is that pair.
- **Values per look** (as in `looks.mjs`):

| Axis | Default | Paper | Console | Playful |
|---|---|---|---|---|
| type | default | serif (new) | mono | default |
| space | 1 | 1.5 | 0.75 | 1.25 |
| radius | 0 | 1 (6 px) | 0 | 3 (18 px) |
| motion | 1, standard | 1.75, calm (new) | 0 | 1.25, bouncy (new) |
| surface | solid | solid | dashed | glass |
| fills | tint* | tint | outline | solid (new) |
| marks | symbols | text | text | symbols |
| sections | title | quiet | title | title |
| labels | as is | section upper | section `// ` lower, button `[ ]` lower | picked `• ` |

  *Default keeps today's ink-filled primary button and picked chip (#53).
- **Schemes and the gate.** All eight schemes (Default pair, Paper light from today, and six new: Paper dark, Console light and dark, Playful light and dark) pass a port of `theme::gate` in `looks.mjs`; `node build.mjs` prints the result. The site build must run the real `theme::gate` on all eight, as it does on Paper now.
- **Motion rule.** Every animation stays on transform and opacity, scaled by `--motion`, and none under reduced motion. Console's 0 means none at all. Playful's overshoot is an easing curve on the same transform, not a new property.

## Crate gaps (separate issues, not site CSS)

The mockups fake these in `axes.css` only so the looks can be judged. Impl must not port that file as it is.

1. **web: the HTML renderer draws every `Style` axis.** Today `theme::css` writes only `--space` and `--motion`, and `blocks.css` never reads `--space`. `--radius` is pinned to 0 px by `DEFAULT_STYLE`, and `style.radius` is ignored. Type, surface, fills, marks, sections and labels never reach the HTML. Swift already reads some of them.
2. **theme: `TypeDesign` gains `Serif`** (Paper). Today it is `Default | Mono`.
3. **theme: `Fills` gains `Solid`** (Playful's bold fills). Today it is `Tint | Outline`.
4. **theme: an easing setting on `Style`** (`standard | calm | bouncy`) for Paper's calm and Playful's bounce. Today the ease is a fixed `DEFAULT_STYLE` value, and `motion` scales only durations.

There is also one site-and-shell change inside this issue: a look is a scheme pair plus a style, but `Live.looks` and the shell's look sheet take one scheme per name today.

## Files

`looks.mjs` holds the four looks (style values, both schemes) and the gate port. `build.mjs` takes a real site build and writes `home-*`, `gallery-*` and `styles-*` pages: it wears each look, puts the switcher in the nav, renames schemes to styles, and builds `looks.css` from `looks.mjs` and `axes.css`. `render.sh` builds the site with `cargo run -p blocks-site`, runs the builder and renders the PNGs with Playwright's cached headless Chromium (reduced motion, light or dark by the device setting). `blocks.css`, `site.css` and `media/` are copied from that build so the pages open on their own. These files are mockups only.
