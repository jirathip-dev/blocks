## Summary

Decision: one new kind, `steps`, draws either a stepper or progress bars on #57's default look (square, ink is the only accent, state colours only in text and small markers). Stepper: numbered squares joined by a line. Done steps are ink with a tick and can be tapped when they have a tap. The current step has an ink ring and a bold name. Phones with 5 or more steps show numbers only, with the current step's name underneath. Progress: an 8 px ink bar from 0 to 100 %. Its tone colours the number and a small tick at the end of the fill. Many bars in one block become planner rows.
Screens: a delivery stop (stop → lines → proof), an inspection bar with planner rows, and a sheet of every state and stress case. Each is drawn light and dark, at 1440 and 390.
Open questions: (1) The bar's fill stays ink, and the tone shows only in the number, the tick and the note, following #57's "no coloured fill" rule. Should a bad or warn bar fill in its tone instead? (2) A stepper with no `current` is drawn as finished (all steps done). Is that right, or should a finished stepper need an explicit flag?

## Images

| Image | What it shows |
|---|---|
| `delivery-light-1440.png`, `delivery-dark-1440.png` | A stepper tile at the top of a delivery stop. Stop is done: an ink square with a tick, a 2 px ink line leading on, and an underlined name because it has a tap. Lines is current: a 2 px ink ring, a bold name and its subtitle. Proof is to do: a grey outline and a grey name. Below, the same stop later: Stop and Lines are both done and both tappable. The lines list and buttons are the existing row and button looks, unchanged |
| `delivery-light-390.png`, `delivery-dark-390.png` | The same at phone width. With 4 steps or fewer, the names still fit (one line each, ending in "…" when too long). Only the current step keeps its subtitle |
| `progress-light-1440.png`, `progress-dark-1440.png` | Inspection: one bar with a label, the percentage on the right, an 8 px track (`--line`) with an ink fill, and a note. Tone `warn` colours the 62 % text, a 3 × 14 px tick at the end of the fill, and the note. Planner: one block holding five bars, drawn as rows (label and note, then the bar, then the number) with a 1 px line between rows. The rows show ok (100 %), no tone (40 %), bad (15 %, overdue), info (70 %) and 0 % (a grey number on an empty track) |
| `progress-light-390.png`, `progress-dark-390.png` | Under 600 px (a container query, so a narrow tile on desktop behaves the same) each row stacks: label and number on one line, then the bar, then the note |
| `states-*-1440.png`, `states-*-390.png` | 1: done steps with a tap (underlined, a button) and without one (plain). 2: keyboard focus on a done step (a 2 px ink ring around its square and a thicker underline); the first step current; finished with no `current`. 3: stress cases. Long text ends in "…" on one line, and the full name is the accessible name. Nine steps: numbers only on a phone, with "Lines · step 6 of 9 · 12 of 40" underneath. No steps: the block's fallback text. 4: bar values and every tone; 130 is clamped to 100 %; a long label ends in "…". 5: planner rows, and no bars (the fallback) |

## Rules impl follows

- Colours are tokens only. Ink (`--l`) draws the done squares, the line between done steps, the current ring and every bar fill. Tones go to text (`--fk-g`, `--fk-a`, `--r`, `--fk-c`, `--fk-p`) and to the 3 px tick (`--g`, `--a`, `--r`, `--c`, `--p`). Square corners come from `--radius`, and blocks have no tinted surface.
- Step state comes from where `current` sits: steps before it are done, it is current, steps after it are to do. Only a done step with a `tap` can be pressed (role `button`, keyboard focusable). Current and to-do steps cannot be tapped.
- Accessibility: the block is a `group` named by its title. Steps are an ordered list, and the current one has `aria-current="step"`. Each step's name is "Lines, step 2 of 3, current". The markers are `aria-hidden`. Each bar is a `progressbar` (min 0, max 100, its value), named by its label, with the note in `aria-valuetext`. Taps on done steps have a hit area of at least 44 px tall.
- Motion: no build-up of its own; the tile settles with the screen like any block. When a value changes, the fill and tick slide over `--enter` (160 ms), and do not move with reduced motion. No clip is needed.
- Fallback: a stepper with no steps, or a progress block with no value and no bars, draws the block's `fallback` text in a plain tile. The static site writer outputs the same markup. A done step whose tap is `open` or a URL becomes a link there; any other tap is drawn plain.
- SwiftUI and the React adapter draw the same parts: an HStack of squares and lines (numbers only under 600 pt when there are 5 or more steps), and an 8 pt track with an ink fill, a tone tick and tone-coloured text.
- The data these drawings assume (impl picks the final field names in the crate): stepper `title`, `steps[] {id, label, sub, tap}`, `current`; one bar `label`, `value`, `tone`, `sub`; rows `title`, `bars[] {label, value, tone, sub}`; plus `fallback`. The stress fixtures are long text, empty, and many rows (9 steps, many bars).

## Files

`steps.css` is everything the kind adds, about 50 rules in the `blocks` layer, and goes into `web/src/blocks.css`. `steps.js` is a port used only to draw these previews (its `focus` field fakes keyboard focus for the image); it is not product code. `page.css` is the host page for the previews only. The tokens come from `../neutral-default/tokens.css`, which matches the generated default pair. Images are made by `./render.sh` (Playwright's cached headless Chromium, light and dark, reduced motion).
