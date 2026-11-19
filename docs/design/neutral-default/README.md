## Summary

Decision: blocks' one built-in pair, "Default light" and "Default dark", is plain neutral grey. Dark-grey ink is the only accent (light grey in dark mode); colour is used only for states (green, amber, red) and the purple and cyan tones. Both pass the gate, and no value comes from the 12 named schemes.
Screens: the core kinds in light and in dark (stats, rows, needs-you, form, cards, buttons, chips, tones, sheet over scrim), and the table of 19 tokens. Each at 1440 and 390.
Open questions: links use the ink colour with an underline, not blue, so nothing reads as a brand. Is that what you want, or should `--link` be a quiet blue?

## Images

| Image | What it shows |
|---|---|
| `kinds-light-1440.png`, `kinds-light-390.png` | Light: grey page, white cards and a dark-ink primary button, selection bar, focus ring and "all" chip. States are coloured: the red needs-you card (15% tint), red and amber group headers (12% tints), the error field, and up and down stats |
| `kinds-dark-1440.png`, `kinds-dark-390.png` | Dark: the same page. Ink turns to light grey (`#d6d6d6`), so a primary button is light grey with dark text. States and tones are lighter so they stay readable |
| `tokens-1440.png`, `tokens-390.png` | All 19 values for both modes and what each one is for. The built pair must match them exactly |

## The 19 tokens

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

`tokens.css` sets the pair the way `theme::css` writes it: light on `:root`, dark under `prefers-color-scheme: dark`. `page.css` is used only by these mockups; blocks has no renderer CSS yet (#15). The pages are `kinds.html` and `tokens.html`. The dark images were rendered with Chrome headless shell and `--blink-settings=preferredColorScheme=0`.
