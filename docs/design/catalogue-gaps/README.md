## Summary

Decision: of the eleven common-UI gaps, only two have an app that needs them today, and both are small additions to what already exists. A list gets empty text, like table, lines, chart and sidebar already have, and every kind's empty text gets one shared look. The shell draws a trail of the screens it came through on wide screens; on a phone, the back button names the screen it goes back to (no wire change). Accordion, popover and pagination already exist. Tabs, tooltip, combobox, date picker, command palette and skeleton have no app asking for them yet, so they stay out.
Screens: a list's empty state (drover threads, cooee queue, the shared look across kinds); the trail on a cooee settings screen three levels deep; a sheet of states and stress cases. Each is drawn light and dark, at 1440 and 390.
Decided (approved 2026-11-24): empty text stays plain, with no action; the screen's own button carries any action. drover's stage chips are drover's to move to the `steps` kind, not a blocks change; a `tabs` look of `chips` waits for an app that switches views with them.

## The gaps on the ladder

The ladder (`docs/extending.md`): 1 token, 2 named variant, 3 new core kind (two apps, or one app on many screens), 4 the app's own kind or an island. Evidence is from `fixtures/screens/` (drover and drover-staging are drover's screens; cooee's are cooee's own and its copies of drover's).

| Gap | Rung | Apps needing it today (evidence) | Decision |
|---|---|---|---|
| Tabs inside a screen | none now (2 later: a `tabs` look of `chips`) | none. `drover/issue.json` and `issue-rounds.json` have `stage` chips with no action, a `selected` that follows the issue's stage, and no section `show` bound to them. That is a stage indicator, not a view switch. Every other chips block (`drover/queue.json` repo, `drover/events.json` kind, cooee's copies) is a filter | not in blocks now |
| Popover | already in blocks | `Act.menu` on screen actions and rows (`drover/queue.json` "More", `cooee/queue-scene-queue.json`); `tap.sheet` for anything bigger | exists: menu and sheet |
| Tooltip | not in blocks | `drover/queue.json` "Legend [?]" opens a sheet; `drover/thread-new.json` puts its hint in a muted text block. Neither needs hover | not in blocks: hover-only help doesn't work on touch or in VoiceOver; help goes in a sheet or muted text |
| Combobox | none now (2 later: a `search` look of the picker field) | none. The largest picker has 6 options (`cooee/fleets-config-global.json` review_rounds); no search field in any screen | not in blocks until a picker outgrows a list |
| Date picker / calendar | none now (2 later: a `date` value of the text field's `keyboard`) | none: no date or time field in any screen | not in blocks now |
| Command palette | 4 | none: no screen has one; drover and cooee reach actions through screen menus | leave to the app (an island) |
| Accordion | already in blocks | card `fold` (one line and a main action, opens in place): `drover/threads.json` "▸ 1 archived", `drover/cards.json`, `cooee/screens-as-data-blocks.json` | exists: card fold |
| Skeleton | not in blocks | none: fixtures are frames, and no screen draws placeholder rows | not in blocks now: the first frame comes in one stream message |
| Empty state | 2: `empty` on `list`, one look for every kind's `empty` | drover: `thread-new.json` hand-builds a "no orchestrator yet" row and a hint text; `queue.json` writes "paused · queue empty" in a row subtitle. cooee: `app-pairing.json` "No server yet?" as text; `fleets-config-fleets.json` "paused · queue empty". Table, lines, chart, heat, boxplot and sidebar each have `empty` text already, each in its own look; list, the most used kind, has none | add as a variant: `list.empty`; table, lines and sidebar move to the one look |
| Breadcrumb | 2: a look of the screen's back (the shell's own stack, no wire change) | cooee, on many screens: `fleets-config-fleets.json` (back "Queue"), `fleets-config-fleet.json` and `-global.json` (back "Fleets"), `fleets-config-role.json` (back "cooee"); `workflow-diagram-fix.json` (back "Map") under `workflow-diagram-map.json` (back "Queue"). Each is a level of one stack the shell already keeps | add: a trail on wide screens; the phone's back button names its target |
| Pagination | already in blocks | `list.more` and `table.more` (a link, or an action with the app's cursor); `docs/design/load-more/` | exists |

## Images

| Image | What it shows |
|---|---|
| `empty-light-1440.png`, `empty-dark-1440.png` | drover's threads screen with one repo empty: the list draws its `empty` text in one tile with the list's own surface (`--card`, 1 px `--edge`, `--radius`), muted text, one row's height. The next repo's rows show the tile matches a row. cooee's fleets screen: a paused fleet, then its empty queue list. Below: list, table, lines and chart empty text, all in the same look |
| `empty-light-390.png`, `empty-dark-390.png` | The same at phone width: the text wraps, and the tile grows with it |
| `trail-light-1440.png`, `trail-dark-1440.png` | cooee's role screen, three levels deep. Above the title: "Queue › Fleets › cooee › rev". Earlier screens are links (`--link`, underlined), the separators are a muted "›", and the current screen is bold `--fg`, not a link. Each link is 44 px tall. This replaces the shell's "‹ back" button at this width |
| `trail-light-390.png`, `trail-dark-390.png` | Under 600 px, the trail becomes the back button, which names the screen it goes back to ("‹ cooee", in the case written) |
| `states-*-1440.png`, `states-*-390.png` | 1 Trail: two deep; keyboard focus on a link (a 2 px ink ring); six deep collapses to the first, a "…" button whose menu lists the hidden screens, then the last two; long titles end in "…" at 20 characters; a screen opened straight from a link has no stack, so no trail; a sheet keeps its own back in its frame. 2 Empty: long text wraps and never ends in "…"; a list with no rows and no empty text draws nothing, as today; a filter that hides every row keeps the table's "No rows match “…”" wording; inside a card the text sits in the card, with no second tile |

## Rules impl follows

- Empty: `list` gets `empty` (text), the same field and type as `table`, `lines`, `chart`, `heat`, `boxplot` and `sidebar`. When a list has no rows, it draws that text; when it has no text either, it draws nothing, as today. One look (`.empty` in `gaps.css`) replaces each kind's own (`tr.tbe`, `.lqz`, `.sde`). Inside a card or sheet, the text sits in its parent with no tile of its own. SwiftUI draws the same tile; the static site writes the same markup. The text is a plain paragraph inside the list's group, named by the list's section header. The list's stress fixtures gain the empty case.
- Trail: drawn by the shell from the back stack it already keeps (`web/src/shell/mount.ts`), plus the title of each screen it passed through. Nothing changes in the wire or the schema. Up to 4 levels are shown in full; beyond that, the first, a "…" button with the hidden levels as a menu, then the last two. Each title ends in "…" past 20 characters, and the full title is the link's accessible name. It is a `nav` named "Breadcrumb" holding an ordered list, and the current screen has `aria-current="page"`. Under 600 px, and in a sheet, the trail becomes the existing back button, which reads "‹ <previous title>" in the case written instead of "‹ back". With no stack (a deep link), there is no trail or back, as today. SwiftUI keeps its NavigationStack back button, which already names its target.
- Colours and sizes are tokens only (`--card`, `--edge`, `--mute`, `--link`, `--fg`, `--l`, `--hit`, `--s*`, `--radius`).
- Follow-ups (approved): #394 list `empty` text and the one shared empty look; #395 the shell's breadcrumb trail. The gaps left out need no issue.

## Files

`gaps.css` is everything the two additions add (about 12 rules). `page.css` is the host page for these previews only. The tokens come from `../neutral-default/tokens.css`, and the existing kinds' look comes from `web/dist/blocks.css`. The images are made by `./render.sh` (Playwright's cached headless Chromium, light and dark, reduced motion). Nothing moves, so there is no clip.
