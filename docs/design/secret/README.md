## Summary

Decision: the web draws `secret` as one password field (label on the left, field on the right, as form rows already are), with a muted line "sent to the app only, never to the agent" and a [send] button under it. It follows the Swift view, except that the field takes typing inline, where Swift opens a popup. The typed value is never kept as a draft or offered to the browser's password store. It clears once sent. An already set secret shows a moss-green "set ✓" and the hint "paste to replace". Look: #53's default pair, square field, no new colour.
Screens: a secret inside a thread's secret card, and a sheet of its states (empty, placeholder, typing, sending, already set, no label). Each is drawn light and dark, at 1440 and 390.
Open questions: (1) The web does not know who posted the card, so the line says "the app" where Swift names the plugin. Is that right? (2) `show` (the visibility expression) has no web evaluator yet for any kind. Should `secret` leave it to that later shared work, as the other views do?

## Images

| Image | What it shows |
|---|---|
| `secret-light-1440.png`, `secret-dark-1440.png` | A thread: the orchestrator's message, then the `secret API_KEY` card (a plain tile with a 4px ochre marker for its warn tone, not a tinted or bordered card) holding the secret with placeholder `sk-…`. Below it is `fixtures/blocks/secret.json` on its own (label "API token", no placeholder), then a secret already set ("GitHub token set ✓", hint "paste to replace") |
| `secret-light-390.png`, `secret-dark-390.png` | The same page at phone width. The label and field stay on one line, the label wraps if long, and "set ✓" never splits |
| `states-light-*.png`, `states-dark-*.png` | 1 empty: [send] on an empty field only focuses it. 2 the `placeholder` as the field's hint. 3 typing: password dots and a 2px ink focus ring; Enter sends. 4 sending: [send] says "sending…" with ↻ (the existing busy style). Success clears the field; a failure keeps the value. 5 `set: true`. 6 no `label`: the field is named by `name` |

## What impl builds

- `web/src/render/secret.ts` replaces `gap(39)`. Its root is `div.secret` (the renderer adds `b b-secret`, `data-block`, `data-id`). `gen/hooks.ts` lists no parts and no variant for `secret`, so there are no `b-secret__*` names.
- Inside it: `label.fd` > `span.fk` (`label ?? name`, plus `span.set` "set ✓" when `set`) and `input` (`type=password`, `name`, `placeholder`, where `set` makes it "paste to replace", `autocomplete=new-password`, `spellcheck=false`, no `draft()`). After that, `div.ra` > `p.m.sn` and a `btn("send")`.
- Send: `c.act({ action, block: id, values: { ...values, [name]: input.value } }, button)`, from the button or Enter. An empty field focuses instead. While it runs the button says "sending…". `ok` clears the input.
- The CSS is `secret.css` here (6 rules, tokens only), going into `web/src/blocks.css`. It reuses `.fd`, `.fk`, `.ra`, `.m` and the button. Budget: about 30 TS lines.
- `page.css` stands in for #53's page and tile rules, for these previews only, as in `docs/design/diagram`. The images come from `./render.sh` (Playwright's cached headless Chromium, light and dark, reduced motion).
