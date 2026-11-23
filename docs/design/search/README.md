## Summary

Decision: the search box is one bordered input with a slot at its end: "searching ↻" while a live form's app answers, "3 of 12" or "no match" when it `filters` a list or table, and [clear] (named "clear") once there is text. No icon: the default look draws controls as text. When the search is its form's only field it spans the column and its label becomes the box's name; among other fields it is an ordinary labelled row. When a filter leaves no rows, the list or table says "No rows match “…”." with [clear], as a table's own filter already does. The app's error, off and Thai look as on other fields. Default look, no new colour.
Screens: the hub's home searching live (before, working, grouped results, the app's no-match line), an admin table and list filtered locally (3 of 12, 2 of 5, no match), and a sheet of every state. Each is drawn light and dark, at 1440 and 390.
Open questions: (1) a table filtered by a search still shows its own "3 of 12 rows" header, so the count appears twice: keep it (recommended: the table stays as it is today) or hide it? (2) should Escape clear the box, as the browser's own search box does? It is not in the ADR's statechart; recommended no for this slice.

## Images

| Image | What it shows |
|---|---|
| `hub-light-1440.png`, `hub-dark-1440.png`, `hub-*-390.png` | `usage.md` part 1. (1) The form's one field: the box spans the column, with the placeholder "Search every app" and no visible label ("Search" is its name). (2) Working: 250 ms after the last key the text goes, the slot says "searching ↻", the old rows stay and typing goes on. A new key starts the 250 ms again and only the newest text is sent. (3) Grouped results: the app's answer is sections of rows, one per app, with no new shape. The text comes back as `value`, so the box keeps it and the focus. (4) No match: the app's own text line. [clear] empties the box and sends `q: ""` at once, and Enter sends at once |
| `filter-light-1440.png`, `filter-dark-1440.png`, `filter-*-390.png` | `usage.md` part 2: nothing is sent. (1) A table (`filter: false`) filtered by "ops BANGKOK": a row stays when every typed word is in its drawn text, in any case. The box says "3 of 12" and the table's header its own "3 of 12 rows". (2) A list filtered by "anong": title, subtitle and value all count; "2 of 5". (3) No match: the box says "no match" and the table's empty row or the list's line says "No rows match “ops hanoi”." with [clear] |
| `states-light-*.png`, `states-dark-*.png` | 1 empty, and typed with focus (the ring is the look's 2 px ink outline on the whole box). 2 working, "3 of 12", "no match", and a long text cut under the slot. 3 among other fields: a labelled row, the same as text and picker. 4 the app's error as the red note under the row, with a red edge inside the box; and off (enabled false), on the page colour with no [clear]. 5 Thai: ล้าง, กำลังค้นหา, "3 จาก 12", ไม่พบ |

## What impl builds

- `web/src/render/field/search.ts`: `label.fd.sr` (adding `.solo` when it is the form's only field and there is no submit, `.off` and `.err`). Inside it, `span.sb` holds the `input[type=search]` (role `searchbox`, its name the label), the status `span.sbn` (`aria-live=polite`, and `aria-busy=true` on `.sb` while sending) and `button.sbx` "clear", which is only there when there is text.
- The words (clear, "{n} of {m}", no match, searching, "No rows match “{q}”.") go in the field's words table in English and Thai. Their text is in `search.js` here. The table reuses its own strings.
- `search.css` here (tokens only) becomes `web/src/css/kind/field-search.css`. It reuses `.fd`, `.fk`, `.fe`, the button and the `s` spin keyframes, which stand still under reduced motion.
- The match rule is `hits()` in `search.js`: split the text on spaces and keep a row when every word is in its drawn text, case-folded. Hidden rows get `hidden`. A list with none left gets one `.lsm.sm` line, and a table its existing `tr.tbe`.
- `page.css` and `search.js` are only for these previews; `.ring` in `page.css` stands in for keyboard focus. Run `./render.sh` to make the images (Playwright's cached headless Chromium, light and dark, reduced motion).
