# The guard's rules

Guard version 2. A new error fails `blocks check`; a warning never fails.

| rule | severity | since | fires on | fix |
|---|---|---|---|---|
| `lint/action-no-id` | warn | 1 | a block that sends an action has no id | Give the block an `id`; tests, the harness and explore find it by id. |
| `lint/actions-many` | warn | 1 | more than 12 actions on a screen, the rows' own not counted | Move the rare actions into a `menu` or a sheet. |
| `guard/baseline-grew` | error | 1 | a baseline gained an entry for a rule older than the file | Fix the finding, or add an ignore with a reason. |
| `guard/baseline-stale` | error | 1 | a baseline entry is no longer found | Run `blocks check --tighten`. |
| `lint/buttons-many` | error | 1 | more than 3 buttons in one group | Keep up to three; move the rest into a `menu`. |
| `render/clipped-text` | error | 2 | text is cut by its box with no ellipsis | Let the text wrap, or shorten it. |
| `render/console` | error | 1 | a console error or an uncaught exception | Fix the script error; the message is in the finding. |
| `render/contrast` | error | 2 | text under 4.5:1 against what is drawn behind it (3:1 from 24 px, or 18.66 px bold); text over an image is skipped and counted | Use a token pair the scheme gate passes: `--fg` on `--bg`, or a tone's own pair. |
| `lint/depth` | error | 1 | blocks nested deeper than 6 | Flatten it: open the inner part as a sheet or a screen of its own with `tap.open`. |
| `lint/destructive-unconfirmed` | error | 1 | a destructive button or act sends an action with no confirm | Add a `confirm` whose title names what is lost. |
| `render/dropped` | warn | 2 | an island sent an event its `events` does not name | Name the event in the island's `events`, or stop sending it. |
| `lint/empty-state` | error | 1 | a list with no rows or a section with no blocks, and no visible text, prose, hero or card beside it | Add a `text` beside it that says what will appear here. |
| `explore/error-screen` | error | 1 | an answer is an error, its ops do not apply, or the screen they give has a fault | Answer with ops that apply to the screen as it is; `Built::check` the result. |
| `lint/fault` | error | 1 | Built::check returns a fault | Build the block with its typed constructor; `Built::check` must return nothing. |
| `css/fixed-width` | error | 2 | a `width` or `min-width` over 390 px | Use `max-width`, or a width in `%`. |
| `render/frame-budget` | warn | 1 | first paint over 300 ms, or a frame over 16.7 ms | Draw fewer blocks at first: page the list, or fold the rest. |
| `lint/island-unsized` | warn | 1 | an island with no size | Reserve its box with `size`, so the page does not jump when it loads. |
| `lint/label-empty` | error | 1 | a blank button, act, chip, option or field label, or row title | Give it a label of one to three words. |
| `lint/label-long` | error | 1 | a button, act or chip label over 30 characters, or a badge over 20 | Shorten it to a verb and its object; move the rest to a `confirm` or a `text` block. |
| `lint/label-twice` | error | 1 | two buttons or acts in one group with one label and different actions | Rename one so that each says what it does. |
| `lint/level-blocks` | warn | 1 | more than 12 blocks in one level, rows not counted | Group them into sections, or split the screen. |
| `css/motion` | error | 2 | a transition or keyframe of anything but `transform` and `opacity` | Animate `transform` or `opacity` only. |
| `render/no-name` | error | 2 | an actionable element or image with no accessible name | Give it a label, or an `alt` for an image. |
| `render/no-size` | error | 2 | a drawn block has no width or no height | Give the block content, or hide it with `show`. |
| `render/overflow` | error | 2 | a block leaves the 390 px width, or the page scrolls sideways | Let the block wrap: remove the fixed width or the unbroken text that holds it open. |
| `render/overlap` | error | 2 | two sibling blocks cover each other | Remove the app rule that positions the block; let the layout place it. |
| `lint/primary-twice` | error | 1 | two primary buttons among one block's children, or one at the top of a screen that has done | Keep one primary action in a group; make the others `plain`. |
| `css/private-selector` | error | 2 | an app selector names a `.b-` class that is no generated hook | Style a hook from the renderer contract (`.b-<kind>`, `.b-<kind>__<part>`, `[data-variant]`, `[data-tone]`). |
| `css/raw-colour` | error | 2 | an app colour property set to anything but a scheme token (`var(--fg)`, `var(--card)`, …), `currentColor`, `transparent` or `inherit` | Use the scheme token for that role, or add the colour to the app's scheme so the gate checks it. |
| `guard/seed-missing` | warn | 1 | a screen with a list has no `empty` fixture, or no `long` one | Add the fixture from the app's fixture writer. |
| `explore/sent-differs` | error | 1 | the renderer sent other actions than the screen declares for the step | Send the action from the block that declares it; an app view posts through the `act` it is handed. |
| `render/tap-target` | error | 2 | a control under 44 by 44 px; a link inside running text is exempt | Give the control at least 44 px each way: use the kind's own button, or drop the app rule that shrinks it. |
| `lint/text-wall` | warn | 1 | a text block's markdown over 600 characters | Use `prose`, or split it under section headers. |
| `lint/title-long` | error | 1 | a title, header or question over 60 characters | Shorten it to 60 characters or fewer; move the detail to `subtitle` or to a `text` block. |
| `render/tree` | error | 2 | the drawn tree is not the one the crate expects: a block missing, or a fallback where a view was expected | Register the kind's view, or send a kind this renderer draws. |
| `render/truncated` | warn | 2 | a title or label ends in an ellipsis | Shorten it, or let it take two lines. |
| `explore/unanswered` | error | 1 | the answerer gave no answer to an action the screen declares | Handle the action in the app, or remove the control. |
| `explore/unstable` | error | 1 | the answerer gave another answer to the same walk | Make the answerer a function of its seed and the actions so far. |
| `lint/untitled` | warn | 1 | a screen with no title | Give the screen a title of one to three words. |
| `guard/unused-ignore` | error | 1 | an ignore matches no finding | Delete the ignore. |
