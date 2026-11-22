---
name: blocks
description: Build a blocks screen as data: the kinds and their fields, the guard's rules, and example screens that pass them. Use it when writing or changing a screen.
---

# blocks

A screen is data: a `screen` or `modal` block of typed blocks, checked, then drawn by a renderer. Start a new screen from a page in `examples/` (each has no guard finding), build it from the kinds below, keep it clear of the rules in `rules.md`, and check it with `blocks check`. Setting up and reading the guard: `docs/guard.md` in the blocks repo.

## Kinds

- [`screen`](kinds/screen.md): A whole screen.
- [`modal`](kinds/modal.md): A box over a screen: a dialog dragged by its header, a fixed confirm or alert, or a tool window that resizes and folds to a pill.
- [`sheet`](kinds/sheet.md): A box over a screen: a dialog dragged by its header, a fixed confirm or alert, or a tool window that resizes and folds to a pill.
- [`section`](kinds/section.md): A titled group of blocks.
- [`list`](kinds/list.md): A list of rows.
- [`row`](kinds/row.md): One row of a list.
- [`card`](kinds/card.md): A card: an ask, a run, a config or a proposal.
- [`choice`](kinds/choice.md): A question with options, a free answer and a default.
- [`form`](kinds/form.md): A form of fields; also the `config` kind.
- [`config`](kinds/config.md): A form of fields; also the `config` kind.
- [`secret`](kinds/secret.md): A secret's input: its value is never sent back.
- [`run`](kinds/run.md): A command the owner approves to run.
- [`button`](kinds/button.md): A button.
- [`chips`](kinds/chips.md): A row of chips, one or many selected.
- [`stat`](kinds/stat.md): Figures: a list of tiles, or one tile inline.
- [`text`](kinds/text.md): Text: markdown, or a plain styled line.
- [`images`](kinds/images.md): A strip of images.
- [`web`](kinds/web.md): A web view of a fixed height.
- [`diff`](kinds/diff.md): A file's diff.
- [`editor`](kinds/editor.md): A text editor and its errors.
- [`scene`](kinds/scene.md): Lanes at work.
- [`diagram`](kinds/diagram.md): A diagram from its source, with counts and its nodes.
- [`composer`](kinds/composer.md): A message box: its send action, its chips and the messages queued; each send, queue or steer carries `values.nonce`, a fresh random id a retry repeats.
- [`lines`](kinds/lines.md): Repeating rows of fields with add and remove, running totals and a balance check.
- [`prose`](kinds/prose.md): Text as a tree of headings, paragraphs, lists, quotes and code.
- [`hero`](kinds/hero.md): A page's opening: a title, a line, a picture and its actions.
- [`media`](kinds/media.md): A picture or a video of a known size.
- [`nav`](kinds/nav.md): A site's link bar.
- [`island`](kinds/island.md): A client component the app hosts: its props in, its named events out.
- [`table`](kinds/table.md): A data table: typed columns, rows by id, sort, filter, totals, row select and export.
- [`steps`](kinds/steps.md): A stepper of named steps with its current one, or progress bars.
- [`chart`](kinds/chart.md): A chart of named series over x values: bar, stacked, line, combo or donut; `move` drags a point's value.
- [`toast`](kinds/toast.md): A short line after an action, in a tone, with an optional undo: an answer's toast, or drawn where it sits.
- [`pages`](kinds/pages.md): A document as the app's server drew it, one picture a page: paged and zoomed in the view, with its PDF.
- [`timeline`](kinds/timeline.md): Rows of bars on a day axis from `from` to `to` (ISO days); `move`, `stretch` and `draw` each send a `DaySpan`.
- [`import`](kinds/import.md): A spreadsheet import the app's server reads: upload a file, check the column match and the row errors, confirm one action.
- [`message`](kinds/message.md): One message of a conversation: who said it, what was said as blocks, and its attachments.
- [`tool`](kinds/tool.md): One tool call: its name, a one-line summary, its state, and a body shown when it is opened.
- [`sidebar`](kinds/sidebar.md): A side navigation: an icon rail that opens on hover or pin, a drawer on a phone.
- [`plot`](kinds/plot.md): A line plot of named series over a numeric or time x: points stream in by `points`; a window, a target and a peak.

## More

- `rules.md`: every guard rule, what fires it and its fix
- `examples/`: whole screens with no finding
