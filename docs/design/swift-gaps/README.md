## Summary

Decision: SwiftUI draws the five missing kinds on the built-in default pair from #53: neutral greys, ink as the only accent, ink links with an underline, square tiles on a faint dot grid that settle in once. The five state colours are #53's muted set (brick red, moss green, ochre, dusty purple, slate teal), used small as text and markers only: no tinted headers or cards, and no coloured fill or outline on a control. Layout and behaviour are unchanged: the composer ports drover's message box, and prose, hero, media and nav make a site page in one readable column.
Screens: composer (four states, light), a content page (nav, hero, prose, media, light), and both in dark.
Open questions: (1) This round changed colours only, so the tiles still have the first round's geometry (3 pt seams, no tile outline, round dots). #53 settles on 2 pt seams, a 1 pt edge on each tile, square dots and an 8 pt rise. Recommended: impl takes #53's style values, so #53 wins. (2) The composer's working state needs a `working` field that the schema lacks. Add it as an optional field? Recommended. (3) Ship attach now? Recommended: yes, and it is the first thing to cut if the Swift budget runs short.

## Images

Rendered by `./render.sh` (Playwright's cached headless Chromium, run until the settle animation ends) at 1440 and 390 wide.

| Image | Decision it shows |
|---|---|
| `composer-1440.png`, `composer-390.png` | **composer**: four states of one block on drover's thread screen, each message and the composer a tile of its own. 1 idle: a square `+`, a field on the page grey, and an ink primary send labelled by `label`. Each `chips` entry sits under the row as a square menu chip, showing its name when unset and `name value` when set. 2 typing: the field gets an ink focus ring and grows to six lines, then scrolls. Attached files show as square thumbnails with ×, and ⌘↩ sends on the Mac. 3 working: a strip with an ink dot, a live timer and a stop in red text (`acts.stop`). Send becomes queue (`acts.queue`), and each `queued` entry is a row with send now (`acts.steer`), edit and remove (`acts.unqueue`). 4: a long press on send (a right click on the Mac) opens a square menu with steer now in ink. Under the row a line shows sending…, ✓ sent in moss green, or not sent in brick red with retry. A chip change posts `acts.model` when the block has it; otherwise the change travels with the next send. When the composer is a screen's last block, it docks at the foot, above the keyboard. |
| `content-1440.png`, `content-390.png` | **nav**: a full-width tile. The brand sits at the left in ink, the links at the right in grey, and the `current` link is ink with an underline, with no tint. At phone width the links scroll sideways under a fade, with no menu button. **hero**: title, subtitle, its media, then its actions as square buttons, the first one in ink. **prose**: headings by level (28, 22, 18 pt) and body-size paragraphs. Lists have a hanging indent, a quote has an ink bar, and code sits in mono on the page grey with its `lang` in the corner. A rule is a hairline. Spans can be bold, italic, code or an underlined ink link, and the text is selectable. **media**: a tile that keeps its `width`×`height` box before the picture loads, so nothing shifts. `caption` sits under it. A `video` shows its `poster` with a square play button and plays in place, and an image opens the images block's zoom sheet. The content tiles keep to one column, 720 pt at most, with the dot grid showing at its sides. |
| `dark-1440.png`, `dark-390.png` | The same kinds in Default dark. Ink turns light grey, so primary buttons are light grey with dark text. The only colours are states, muted and in text only: stop and not sent in brick red, sent in moss green. A media that is still loading shows its `alt` in its reserved box. Only the built-in pair is drawn, not a named scheme or an app look. |

## Look rules

- The tokens are #53's 19 values (branch `design-53`, the muted state set from q2158), copied unchanged into `look.css`. Nothing here adds a colour.
- State colours appear only as text and small markers. A destructive button such as stop or remove keeps the grey edge and card fill and shows its label in `--r`.
- Tiles: square corners, `--card` fill, no border, 3 pt seams. Behind them is the page (`--bg`) with a dot every 16 pt at 22% of `--fg`.
- Settle: on first load each tile fades in and rises 6 pt, 0.2 s each, 40 ms apart, all done under 0.4 s, and only once; patches never replay it. Under reduced motion the tiles appear in place, with no movement or fade. The pages animate when opened in a browser.

## For impl

- Reuse before adding: `surface`, `CardButton`, `RoundButton`, `Mark` and the images block's `Picture` and zoom sheet. The budget is +260 Swift for all five kinds.
- If the budget runs short, these wait first, in order: the content kinds, then the composer (migration.md); attach is the first part of the composer to cut.
- Afterwards no `Gap(` is left, and every kind has a render test.
