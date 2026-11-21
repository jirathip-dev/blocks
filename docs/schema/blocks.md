# Blocks

A block is a JSON object whose `type` names its kind, as drover and cooee send it: `{"type": "row", "title": "Hi"}`.
The core kinds are the superset of both apps': cooee's 21 (`screen`, `sheet`, `section`, `list`, `row`, `card`,
`choice`, `form`, `config`, `secret`, `run`, `button`, `chips`, `stat`, `text`, `images`, `web`, `diff`, `editor`,
`scene`, `diagram`), drover's `composer`, the content kinds `prose`, `hero`, `media`, `nav`, the `island`, the
line-item editor `lines`, `steps` (a stepper or progress bars), the data `table`, the `toast` an action's answer
carries, the `timeline`, and the chat's `message` and `tool`, with every field either app sends.
Each kind has `new(<its required fields>)` and a setter per optional one; a server builds its blocks so, never with
`json!`. Any other `type` is an app's own kind (`AppBlock`): it is
kept whole, and may carry a `fallback` row. A core kind of the wrong shape is refused, by the types and by the
schema. `Built::of` writes a server's own screen with the fallback of each kind a client may not draw, and
`Built::check` lists its faults: an id twice, an unknown kind, a wrong shape, a field its kind lacks, an app kind
named like a core one or with no fallback, a state key read but not declared, a stepper with neither a
current step nor `done`.

A `message` is one message of a conversation: its `role` (`agent`, `owner`, `system`), its speaker's `name` and an
optional `avatar` and `time` (drawn muted beside the name; a repeat speaker's message hides its head, time included),
then its `blocks` in the order they were said (a `prose` for text, a `tool` for each tool call, any
other block), then its `files`, each a `name`, a `tap` that opens it and, for an image, a small `src`. A `tool` is one
call: its `name`, its `state` (`running`, `done`, `failed`), a one-line `summary` and an optional plain-text `body`
folded until opened. A `prose` with `streaming` is still being written: renderers draw a caret after it and mark it
busy, and `diff` grows it by `append` (stream.md). `Prose::read` turns markdown into parts once, on the server.

A `lines` block's `calc` maps a column to an `Expr` over its row's values (`{"mul": [{"get": "qty"}, {"get": "price"}]}`),
worked out as you type; its `sum` columns are totalled in minor units (`scale` decimals, default 2), never as floats.

A `toast` is a short line after an action: a `title`, a `tone` (`ok`, `warn`, `bad`, else plain) and an optional
`undo` (`label`, default "undo", and the `action` it sends with its `values` and any `confirm`). An `Answer`'s
`toast` carries one, and the web shell shows it over the screen: one at a time, at most 3 waiting, gone after 4 s
(plain, ok), 6 s (warn) or 8 s (with an undo), a `bad` one only when dismissed. Placed in a screen, every renderer
draws it as one quiet line with no undo. An empty `title` draws the fallback, "Done" unless it has its own.

`fixtures/screens/` holds both apps' screens as they sent them, copied verbatim (cooee at `8ca09a316`, drover at
`dd475fcf0`), and `cooee/screen-tests-insert.json`, cooee's `ScreenTests` inserts written out as frames. Each
parses into the Rust types and serializes back equal, fits the schema, and decodes in Swift. None has a fault a
reader sees (a wrong shape, an unknown field or kind) but drover's `scene` of the herd, its own shape, which
becomes drover's app kind `herd`.
