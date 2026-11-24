## Summary

Decision: the slider field (form v2 F3) sits in the form row like any field: its label on the left (above it on a phone), a 4 px track with an ink fill up to a 16 px square thumb, the value with its unit ("110 %") riding just above the thumb and following it live, and min and max under the track's ends. Pressed: a grey halo and a bold value; keyboard focus: the 2 px ink ring. In a live form the action goes once, on let go. Off greys the fill and thumb and fades the field. The app's error is the red edge and line other fields use. Default look, no new colour.
Screens: hub's Settings screen with the text-size slider (80 to 130 %, step 5), plus an hours-worked slider in a form with a submit; and a sheet of every state (at a value, at min, at max, no value, dragging, keyboard, off, error, Thai, a long label). Each is drawn light and dark, at 1440 and 390.
Open questions: none.

## Images

| Image | What it shows |
|---|---|
| `settings-light-1440.png`, `settings-dark-1440.png` | hub `/settings` (`usage.md` part 3): `Text size` at 110 %, a live form with no submit. The line under it shows what is sent on let go, `text-size { size: 110 }`; nothing is sent while the thumb moves. Below it is the existing language picker and a toggle, for scale. Then manpower-request's `Hours worked` (0 to 12 h, step 0.5, at 7.5 h) between two text fields: in a form with a submit, nothing leaves until [send request] |
| `settings-light-390.png`, `settings-dark-390.png` | The same on a phone. The slider row stacks: its label on top, the track full width under it, so a step stays wide enough for a thumb (11 steps over about 340 px). Other fields keep their side-by-side rows |
| `states-light-*.png`, `states-dark-*.png` | 1 At rest: the value is centred over the thumb mid-track and flush with the track's end at min and max, so it never leaves the field. A field with no `value` starts at `min`, and with no `unit` it shows the bare number. 2 Moving: pressed (halo and bold value) and keyboard focus (ring). A number shows only the places it needs ("7.5 h", "12 h"). 3 `enabled` false; the app's `error`; a Thai label (numbers and unit unchanged); a label long enough to wrap in its column |

## What impl builds

- `web/src/render/field/slider.ts`: the row is `div.fd.sl` and the control `div.fs`, with `--v` set to (value − min) / (max − min). Inside it, in order: a native `input[type=range]` (`name`, `min`, `max`, `step`, `value`, `disabled`) laid over the whole control at opacity 0, so it gives the `slider` role, min, max, now, the keyboard and the pointer; `aria-label` is the label and `aria-valuetext` the drawn text ("110 %"). Then `output.fsv` (the value), `span.fst > b` (track and fill), `span.fsb` (thumb) and `span.fse` (min and max), all aria-hidden. An app error is `span.fe` last.
- On `input`: set `--v`, the value text and `aria-valuetext`, and report the number through `lit`, and keep the draft (as text does). On `change` (let go, or a key): `c.set(number)`, which in a live form sends `{ size: 110 }` alone.
- The value text is the number with only the places it needs, then a no-break space and `unit` when set. No `value` starts at `min`.
- `slider.css` here (tokens only) goes into the stylesheet folder. It reuses `.fd`, `.fl`, `.fe` and `--mark`. Pressed and focus are `:active` and `:focus-visible` through `:has()`; the `.drag` and `.kb` classes in `page.css` only stand in for them in a still image. Under 600 px wide the row stacks, as upload's does.
- `slider.js` and `page.css` are only for these previews. The pages work in a browser: drag the thumb and the label follows; let go and the line under hub's slider shows what would be sent. Run `./render.sh` to make the images (Playwright's cached headless Chromium, light and dark, reduced motion).
- SwiftUI and the desktop draw the same parts with their own slider: the value above the thumb, min and max under the ends, the same value text.
