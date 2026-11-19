## Summary

Decision: SwiftUI draws the five missing kinds on the existing Look (its palette, surfaces, buttons and pictures), with no new colours. The composer ports drover's message box: a growing field, attach, a send button that becomes queue while a turn runs, queued rows, a stop pill and pickers. prose, hero, media and nav are drawn as a site page in one readable column.
Screens: composer (four states), a content page (nav, hero, prose, media), and both under the still and terminal looks.
Open questions: (1) the composer's working state (the stop pill, send turning into queue) needs a `working` field the blocks schema lacks. Add it as an optional field? Recommended; without it the composer is idle-only. (2) Should attach ship now, or go first if the 260-line Swift budget runs short? Recommended: ship it, first to cut.

## Images

Rendered by `./render.sh` (Playwright's cached headless Chromium) at 1440 and 390 wide.

| Image | Decision it shows |
|---|---|
| `composer-1440.png`, `composer-390.png` | **composer**, four states of one block on drover's thread screen. 1 idle: a `+` round button, a field in the same glass capsule the old placeholder used, and a primary send button labelled by `label`. Under the row, each `chips` entry is a menu pill (its name when unset, `name value` when set). 2 typing: the field grows to six lines, then scrolls; attached files show as thumbnails with ×; ⌘↩ sends on the Mac. 3 working: a pill with a live timer and stop (`acts.stop`); send becomes queue (`acts.queue`); each `queued` entry is a row with send now (`acts.steer`), edit and remove (`acts.unqueue`). 4: a long press (a right click on the Mac) on send offers steer now; under the row, a line shows sending…, ✓ sent, or not sent with retry. A chip change posts `acts.model` when the block has it; otherwise it travels with the next send. A composer that is a screen's last block docks at the foot, above the keyboard. |
| `content-1440.png`, `content-390.png` | **nav**: the brand at the left in the lead colour, links at the right, the `current` one tinted. At phone width the links scroll sideways under a fade; there is no menu button. An `href` opens like a row's tap url. **hero**: title, subtitle, its media, then its actions as card buttons, the first one primary. **prose**: headings by level (28, 22, 18 pt), paragraphs at body size, bullet and numbered lists with a hanging indent, a quote with a lead-coloured bar, code in mono on a surface with its `lang` in the corner, a rule as a hairline; spans can be bold, italic, code or a link, and the text is selectable. **media**: the box takes `width`×`height` before the picture loads, so nothing shifts; `alt` shows until it loads; `caption` sits under it; a `video` shows its `poster` and a play button and plays in place; an image opens the zoom sheet the images block already has. Content stays in one column, 720 pt at most. |
| `looks-1440.png`, `looks-390.png` | The same kinds under the still look (farm light, solid) and the terminal look (github-dark, mono, dashed, outline, text marks): the new views take everything from Look. Terminal uses `[+]` and `[v]` in place of symbols, square corners and an underlined current link. A media that is still loading shows its alt in its reserved box. |

## For impl

- Reuse before adding: `surface`, `CardButton`, `RoundButton`, `Mark` and the images block's `Picture` and zoom sheet. The budget is +260 Swift for all five kinds.
- If the budget runs short, these wait first, in order: the content kinds, then the composer (migration.md); attach is the first part of the composer to cut.
- Afterwards no `Gap(` is left, and every kind has a render test.
