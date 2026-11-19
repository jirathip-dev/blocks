## Summary

Decision: a look switcher sits in the nav on every page and restyles it in place. Each of the four looks pushes every axis to its extreme, through tokens only. Default is today's site. Paper is serif, airy (space ×2), hairlines on the page's own colour and outlined buttons. Console is mono, dense (×0.5), square and borderless, with blocks shown as fills and buttons as `[label]`. Playful has a clean white base, 24 px corners, soft grey fills instead of borders, a black pill for the primary action and five bright accents per item. Each look has a light and a dark scheme, both passing the gate. A Styles page replaces the schemes page.
Screens: home, gallery and Styles, each drawn in all four looks, light and dark, at 1440 and 390 (48 images).
Open questions: three axis values and two new axes the crate lacks (listed below) need their own issues before impl. Should the orchestrator file them and block impl on them (recommended)?

## What changed since the last round (q2358, q2359)

- **Extremes.** Console spacing 0.75 → 0.5, its dashed edges → none (new `filled` surface). Paper 1.5 → 2 and calm motion 1.75 → 2; its cards take the page's own colour with a hairline edge (new `hairline` surface), and its buttons are outlined. Playful is redrawn per q2358: white base, radius 3 → 4 (24 px, so buttons and chips become pills on their own), grey fills with no edges, an ink primary (black in light, white in dark) and five accents that cycle per item.
- **Space fix.** Round one set row padding by hand and dropped the side padding, so rows touched the card edge. Now every look scales the renderer's own spacing tokens (`--s1…--s4`, the seam, the card's inside edge) by `space`. Every card's inner padding grows and shrinks with the look. On a phone the Styles page's four samples stack one per row instead of two by two, so no list is squeezed. No row touches or clips at a card edge in any look, at either width.
- **All four looks redrawn, light and dark**, on every page (round one drew only some of them dark).

## Images

| Image | What it shows |
|---|---|
| `home-default-{light,dark}-{1440,390}.png` | Default is unchanged from today. The only additions are the switcher (Default pressed) and *styles* in place of *schemes* |
| `home-paper-{light,dark}-{1440,390}.png` | Paper: serif, 32 px card padding and gaps, cards the page's own colour with hairline edges, outlined primary, quiet upper-case section headers with a rule under them, state marks as words |
| `home-console-{light,dark}-{1440,390}.png` | Console: mono, 8 px padding, 1 px seams, square, no edges anywhere (blocks are tone-shifted fills and the dot grid is gone), tinted `[label]` buttons, `// lower` section headers, no motion |
| `home-playful-{light,dark}-{1440,390}.png` | Playful: white base (near-black in dark), grey cards with no edges, 24 px corners, a black pill for *see the kinds* (white in dark), grey pills for the rest. Each row takes the next accent for its initial disc, and each stat for its number: purple, blue, green, orange, pink |
| `gallery-{look}-{light,dark}-{1440,390}.png` | The first screens of all 30 kinds in each look. Every kind follows the look with no work of its own: spacing, corners, surface, fills, marks and accents reach rows, cards, chips, tags and state marks |
| `styles-{look}-{light,dark}-{1440,390}.png` | The Styles page while wearing each look: an intro, then one section per axis (colour, type, space, radius, motion, surface, fills, accents, marks, sections, labels). Each has a line on what the axis does and four samples, each pinned to its own look with its value shown. *Wearing* marks the current look and *is new* marks a value the crate lacks. Motion is drawn as three frames with its numbers. Four across at 1440, one per row at 390. It ends with *Bring your own* |

## Decisions

- **Switcher.** It goes in the nav because the nav is on every page: four buttons, each with a swatch of that look. Picking one swaps the look's tokens with no reload and is remembered (the shell's `b:look` store), so the choice holds across pages. It never picks light or dark; the device does. With JS off it is hidden and the page wears Default. On a phone it takes its own row of four.
- **Schemes merge into Styles.** Colour is one axis of eleven, so the schemes page's content becomes the Styles page's first and last sections, and the schemes page and its sheet button go. That leaves one place to pick a look.
- **Tokens only.** Every difference comes from a scheme token or a `Style` value: the renderer's spacing tokens times `space`, `--radius` from `radius`, and the surface, fills and accents values mapped to a few tokens. Nothing per look is hand-styled in site CSS. The font weight trick from round one is gone.
- **The looks are the site's own,** in `site/` beside Paper today. The crate's default pair and `DEFAULT_STYLE` stay as they are.
- **Values per look** (as in `looks.mjs`):

| Axis | Default | Paper | Console | Playful |
|---|---|---|---|---|
| type | default | serif (new) | mono | default |
| space | 1 | 2 | 0.5 | 1.5 |
| radius | 0 | 1 (6 px) | 0 | 4 (24 px) |
| motion | 1, standard | 2, calm (new) | 0 | 1.5, bouncy (new) |
| surface | solid | hairline (new) | filled (new) | filled (new) |
| fills | solid* | outline | tint | solid (new) |
| accents (new) | none | none | none | cycle |
| marks | symbols | text | text | symbols |
| sections | title | quiet | title | title |
| labels | as is | section upper | section `// ` lower, button `[ ]` lower | as is |

  *Default's primary is ink-filled on the site today, though `DEFAULT_STYLE` says tint. Once `solid` exists, Default names it.
- **Schemes and the gate.** All eight schemes pass a port of `theme::gate` in `looks.mjs`. `node build.mjs` prints the result. Playful also checks its five accents: the disc's letter (the page colour) is at least 4.5:1 on each accent, and each accent is at least 3:1 on a card. The site build must run the real `theme::gate` on all eight, as it does on Paper now.
- **Motion rule.** Every animation stays on transform and opacity, scaled by `--motion`, and none under reduced motion. Console's 0 means no motion at all. Playful's bounce is an easing curve on the same transform.

## Crate gaps (separate issues, not site CSS)

The mockups map these in `build.mjs` and `axes.css` only so the looks can be judged. Impl must not port those files as they are.

1. **web: the HTML renderer draws every `Style` axis.** Today `theme::css` writes only `--space` and `--motion`, and nothing reads `--space`. The fix is for the spacing tokens to be `--space` times their base, as these mockups do. `radius` is ignored, and type, surface, fills, marks, sections and labels never reach the HTML.
2. **theme: `TypeDesign` gains `Serif`** (Paper).
3. **theme: `Surface` gains `Hairline` and `Filled`** (Paper; Console and Playful). Today it is `Glass | Dashed | Solid`.
4. **theme: `Fills` gains `Solid`** (Playful's ink pill, and today's Default primary).
5. **theme: an easing setting on `Style`** (`standard | calm | bouncy`). Today `motion` scales only durations.
6. **theme: an `accents` axis (`none | cycle`) and five accent tokens on a scheme**, checked by `theme::gate` as above (Playful's colour per item).

Inside this issue there is one site and shell change: a look is a scheme pair plus a style, but `Live.looks` and the shell's look sheet take one scheme per name today.

## Files

`looks.mjs` holds the four looks (style values and both schemes) and the gate port. `build.mjs` takes a real site build and writes `home-*`, `gallery-*` and `styles-*`. It wears each look, puts the switcher in the nav, renames schemes to styles, adds the accent discs and builds `looks.css` from `looks.mjs` and `axes.css`. `render.sh` builds the site with `cargo run -p blocks-site`, runs the builder and renders every PNG with Playwright's cached headless Chromium (reduced motion, light or dark by the device setting, cut to the page's height, the gallery to its first screens). `blocks.css`, `site.css` and `media/` are copied from that build so the pages open on their own. These files are mockups only.
