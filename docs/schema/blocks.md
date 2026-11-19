# Blocks

A block is a JSON object whose `type` names its kind, as drover and cooee send it: `{"type": "row", "title": "Hi"}`.
The core kinds are the superset of both apps': cooee's 21 (`screen`, `sheet`, `section`, `list`, `row`, `card`,
`choice`, `form`, `config`, `secret`, `run`, `button`, `chips`, `stat`, `text`, `images`, `web`, `diff`, `editor`,
`scene`, `diagram`), drover's `composer`, the content kinds `prose`, `hero`, `media`, `nav` and the `island`, 27
in all, with every field either app sends. Each kind has `new(<its required fields>)` and a setter per optional
one; a server builds its blocks so, never with `json!`. Any other `type` is an app's own kind (`AppBlock`): it is
kept whole, and may carry a `fallback` row. A core kind of the wrong shape is refused, by the types and by the
schema. `Built::of` writes a server's own screen with the fallback of each kind a client may not draw, and
`Built::check` lists its faults: an id twice, an unknown kind, a wrong shape, a field its kind lacks, an app kind
named like a core one or with no fallback, a state key read but not declared.

`fixtures/screens/` holds both apps' screens as they sent them, copied verbatim (cooee at `8ca09a316`, drover at
`dd475fcf0`), and `cooee/screen-tests-insert.json`, cooee's `ScreenTests` inserts written out as frames. Each
parses into the Rust types and serializes back equal, fits the schema, and decodes in Swift. None has a fault a
reader sees (a wrong shape, an unknown field or kind) but drover's `scene` of the herd, its own shape, which
becomes drover's app kind `herd`.
