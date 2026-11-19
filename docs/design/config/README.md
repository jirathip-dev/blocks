## Summary

Decision: the web draws `config` as a settings list, like the Swift app: one row per field, with the name and one short note on the left and the control on the right. Below 480 px wide the control moves under the name, except toggles. With an `action`, each change saves at once and the row shows "saving…". With a `submit`, a [save] button at the bottom sends every field. Look: #53's default pair, light and dark, square corners.
Screens: a plugin's settings screen (a form saved with the button, and alerts that save as you change them), and a sheet of every field state. Each is drawn light and dark, at 1440 and 390.
Open questions: (1) Nothing reads a field's `open` yet. I drew it as "this field has the focus when the screen opens" (ink ring). Is that what it means? (2) Text and secret fields send their change when you leave the field or press Enter, not on every key. Is that right?

## Images

| Image | What it shows |
|---|---|
| `config-light-1440.png`, `config-dark-1440.png` | A settings screen with two tiles. **EDGAR plugin settings** (cooee's own fixture, with more fields) has a `submit`: a text field with a doc note; a picker; a url field whose value changed (ink "was https://www.sec.gov"); and a secret that is set ("set ✓ · type to replace", never the value). A right-aligned `[ save ]` sits in the usual bracket button. **Alerts** has an `action` and no button: two square toggles (ink when on, grey when off), a picker that is saving ("saving…" under its name), a number field in error (3 px brick marker on the control, brick note), and an empty url field showing its placeholder |
| `config-light-390.png`, `config-dark-390.png` | The same at phone width. A container query below 480 px puts each text, secret or picker control under its name, at full width. Toggles stay on the right |
| `states-light-*.png`, `states-dark-*.png` | 1 text: value, placeholder, `url` and `number` keyboards (a number value is shown as text). 2 notes: only one shows. Error wins, then "was", then doc. An error also marks the control. 3 a toggle on and off, and a picker whose value is not in its options (the value is listed first, as `form` does now). 4 a secret not set ("not set", or its placeholder) and set. 5 `open`: focus plus the ink ring. 6 live save: "saving…" in grey, then "not saved" in brick if the send fails. 7 submit while sending (the button's ↻) and with `off` (disabled). 8 `fixtures/blocks/config.json` as it is |

## The rules

- Layout: label column 2 parts, control column 3 parts (a toggle's row is the name and then the switch). Each row is at least `--hit` tall, with a `--line` rule between rows. There is no rule under the last row.
- Controls: as `form`'s (`.fd` label, `input`/`select`), with square corners, the `--bg` fill and a `--ctl + --s2` height. A toggle is a 36×20 square switch: `--l` when on, `--edge` when off, with a `--bg` knob. Focus and `open` get a 2px `--l` outline.
- One note at most, in `--fs-meta`: `error` (`--r`, and the control gets an inset 3px `--r` marker and `aria-invalid`), else `was` ("was X", `--l` ink), else `doc` (`--mute`). While a live save is in flight, "saving…" (`--mute`) replaces the note. If the send fails, "not saved" (`--r`) shows until the next change. A server reply that sets `error` or `was` replaces either one.
- `keyboard`: `url` gives `type=url`, `inputmode=url`; `number` gives `inputmode=decimal` (still `type=text`, so a server's "4.5" survives); `default` gives text.
- `secret`: the input is always empty (`type=password`). Its placeholder is "set ✓ · type to replace" when `set`, else the field's placeholder, else "not set". An empty secret is left out of what is sent, so saving never clears it.
- Saving: with `action`, a toggle or picker sends `{action, block, values: {name: value}}` as soon as it changes. A text or secret field sends when it is changed and left (`change`: blur or Enter). With `submit`, nothing sends until `[ save ]`, which sends every field merged over `submit.values`. `off` disables it, and it shows ↻ while sending. With neither, the fields only feed the enclosing sheet's submit, as in Swift.
- Motion: none of its own. The tile settles like every tile (#53).

## What impl builds

- `web/src/render/config.ts` replaces `gap(40)`, reading `Form` (the generated type `config` shares with `form`). The root is the `b b-config` element `index.ts` already sets; `gen/hooks.ts` gives config no parts, so it adds no part names. Classes are `form cfg`, so `form.ts`'s `values()` reads it unchanged. Its field drawing comes from `form.ts`'s `field()`, extended there (not copied) with the note, `keyboard`, `set`, `open` and `aria-invalid`. Keeping one field function follows the "never two ways" rule.
- CSS: `config.css` here (18 rules, tokens only) goes into `web/src/blocks.css`. `page.css` is #53's page and tile, for these previews only.
- `config.js` here is a preview-only port used to draw these images; it is not product code. Images: `./render.sh` (Playwright's cached headless Chromium, light and dark, reduced motion).
