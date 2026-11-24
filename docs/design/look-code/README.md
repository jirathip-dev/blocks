## Summary

Decision: a look becomes one short code: a version character, five characters for the style axes, an optional labels part after `~`, and an optional scheme name after `.`. Examples: `101yx6` is Default, `108bd0.paper` is Paper's colours with Playful's style. The code only names the scheme (a swag pack, or the app's own look). blocks never carries colours or keeps a list of names. The Styles page gets a Code section with the worn look's code, copy code and copy link buttons, and all four codes. A link with `?look=` puts that look on and keeps it, shows a "Shared" switcher button, and gives an undo toast. A bad code keeps your look and shows one toast saying why.
Screens: the Styles page with its Code section (Default light, Console dark); home opened from a shared link; the format page with the code's parts, axis order, examples, app usage and error toasts. Each is drawn at 1440 and 390 wide.
Open questions: none. Space, radius and motion go in quarter steps. A style off a quarter step has no code, and encoding it names that axis. Say if you want rounding instead.

## Images

| Image | What it shows |
|---|---|
| `styles-default-{1440,390}.png` | Styles page, Default look. A new **Code** section sits right after the intro. It has the worn look's code as a big stat, its parts coloured (version, style, labels, scheme) and a plain caption. Below it are **copy code** (primary) and **copy link** buttons, a parts list, and **The four**, each look's code as a link that opens `styles.html?look=<code>` |
| `styles-console-{1440,390}.png` | The same page wearing Console, in dark. This is the longest code of the four (`10lspy~BAMvLyAAEAFbAV0.console`), because Console decorates header and button labels. At 390 the code wraps on any character and never clips |
| `shared-{1440,390}.png` | `index.html?look=108bd0.paper` opened on a phone or desktop: Paper's colours with Playful's style (round corners, pills). A fifth switcher button, **Shared**, is pressed. A toast says *Wearing a shared look: Paper's colours, Playful's style*, with **undo**. The site's per-look showcase CSS (hero, ornaments) follows the scheme name, so this page has Paper's drop cap and hairlines |
| `format-{1440,390}.png` | The format, the code's spec as a site page under Styles. It shows the parts, the ten axes in order with each value's digit, how labels are packed, the scheme rule, examples (including a swag name, `101yx6.dusk`), the Rust and TS usage, and the four error toasts: wrong version, made by a newer blocks, unknown scheme (warns, then wears the style on blocks' own pair), not a code |

## Format, version 1

- `<version><axes>[~<labels>][.<scheme>]`, case-sensitive, URL-safe with no escaping.
- **version**: one character, `1`. A reader refuses any other: *version 9: this reader takes 1*.
- **axes**: one mixed-radix number written as 5 base-36 characters (`0-9a-z`). The lowest digit comes first: type (3), space (17), radius (17), motion (17), easing (3), surface (3), fills (3), buttons (2), marks (2), sections (2). Each value's digit is its place in the crate's `ALL` list, so 0 is the `#[default]`. The axes use 3,183,624 of the 60,466,176 values five characters hold. A future axis goes on as a higher digit whose 0 is its default, so every old code still decodes the same. A value at or above the span is refused as *made by a newer blocks*. The version goes up only when an existing axis changes meaning.
- **scales**: space, radius and motion in quarter steps from 0 to 4. Every value in today's `site/looks.json` is on a quarter step.
- **labels**: present only when `Style.labels` has entries. For each entry in role order (kind, header, group, section, title, button, chip, back, said, picked), it writes one byte `role × 3 + case` (as-is, lower, upper), then the prefix and the suffix, each as a length byte followed by its UTF-8 bytes. The result is base64url with no padding. Every entry is written, even a default one, so the code round-trips the map exactly.
- **scheme**: `.` followed by `[a-z0-9][a-z0-9-]{0,31}`. A code without one wears blocks' own `theme::default()` pair. `.default` is refused, so each look has only one code. The app resolves the name against the pairs it has: `mount`'s `schemes`, the site's four looks, or a swag pack the app pins. A name it lacks gets a warning toast, and the style goes on blocks' own pair.
- **format field**: a code always decodes to `format: 2`. A format-1 style encodes as its format-2 equivalent, with space and motion at 1.

## For impl

- Rust: `blocks::theme::LookCode { style: Style, scheme: Option<SchemeName> }` with `FromStr` (decode, `CodeError` variants: `NotACode`, `Version(char)`, `Newer`, `Labels`, `Scheme`) and `Display` (encode). Building one from an off-step `Style` fails with the axis named.
- TS: `lookCode.decode` / `lookCode.encode` in `web/src/core`. `mount({ look })` is the app's own look, the one the look sheet calls "the app's own". An owner's stored pick still wins over it.
- Site: `?look=<code>` decodes at the edge. A good code is stored in `b:look` as the code, gets `data-look` set to the scheme name (or `default`) plus `data-shared` when it isn't one of the four, and shows the toast. A named look click stores the same thing, so there is one stored form. The Code section and the format page are site Rust. The proposed CSS is the `#look-code-proposal` block in each page (`.lc`, its four part colours from tokens, and the row wrap at 390).
- Tests: one per axis (each value round-trips), labels with every role and a multi-byte affix (`‹`), each `CodeError`, and the four site codes above pinned in both languages.
- Not in this design: a playground export (the issue allows the Styles page or the playground; Styles is enough for the AC) and Swift decoding.

## Files

- `code.js`: the reference encoder and decoder that produced every code shown here (preview only). Round-trip of all four site looks was checked with Node.
- `build.mjs` and `render.sh`: build the real site from HEAD, inject the preview sections, write the worn look's CSS with the real `web/src/core/look.ts`, and render with headless Chromium.
- `blocks.css`, `blocks.js`, `site.css` and `media/` come from that build, so the pages open on their own.
