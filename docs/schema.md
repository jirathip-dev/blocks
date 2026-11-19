# The wire schema

The Rust types in `crates/blocks/src/` (`Block` and its kinds in `kind/`, `Expr` in `expr.rs`, `Op`, `Action`,
`Answer` and the stream's messages in `wire`) are the one source.
`just gen` derives the rest, and CI's arch-check fails a PR whose generated files differ from what it writes:

- `schema/blocks.schema.json`: the JSON Schema of a `Frame`; `$defs` hold `Block`, `Op`, `Hello`, `Bye`, `Sync`, `Synced`
  and the old per-screen `OldFrame`
- `schema/sample.json`: old per-screen frames serialized by the Rust code, which the Swift test decodes
- `web/src/gen/types.ts` and `web/src/gen/sample.ts`: the TS types, and the sample type-checked against them
- `web/src/gen/hooks.ts`: each kind's style hooks, its `variant` field and its `parts`
- `web/src/gen/schemes.ts` and `swift/Sources/Blocks/Gen/Schemes.swift`: the theme's scheme tokens
- `swift/Sources/Blocks/Gen/Blocks.swift`: the Swift `Codable` types (`JSONValue.swift` beside it is kept by hand)
- `swift/Sources/Blocks/Gen/Style.swift`: `theme::Style`, an app's `style.json`, which `fixtures/styles/` holds good and bad
- `swift/Sources/Blocks/Gen/LayoutShapes.swift`: `layout::Place` and `layout::Transition`, the words a `layout.json`
  places with; `fixtures/layouts/` holds cooee's default and the bad files both readers refuse with `refused.json`'s reasons
- `fixtures/blocks/<kind>.json`: each kind's typed sample (`blocks::samples()`), one file per kind

## Blocks

A block is a JSON object whose `type` names its kind, as drover and cooee send it: `{"type": "row", "title": "Hi"}`.
The core kinds are the superset of both apps': cooee's 21 (`screen`, `sheet`, `section`, `list`, `row`, `card`,
`choice`, `form`, `config`, `secret`, `run`, `button`, `chips`, `stat`, `text`, `images`, `web`, `diff`, `editor`,
`scene`, `diagram`), drover's `composer`, the content kinds `prose`, `hero`, `media`, `nav`, the `island` and the line-item editor `lines`, 28
in all, with every field either app sends. Each kind has `new(<its required fields>)` and a setter per optional
one; a server builds its blocks so, never with `json!`. Any other `type` is an app's own kind (`AppBlock`): it is
kept whole, and may carry a `fallback` row. A core kind of the wrong shape is refused, by the types and by the
schema. `Built::of` writes a server's own screen with the fallback of each kind a client may not draw, and
`Built::check` lists its faults: an id twice, an unknown kind, a wrong shape, a field its kind lacks, an app kind
named like a core one or with no fallback, a state key read but not declared.

A `lines` block's `calc` maps a column to an `Expr` over its row's values (`{"mul": [{"get": "qty"}, {"get": "price"}]}`),
worked out as you type; its `sum` columns are totalled in minor units (`scale` decimals, default 2), never as floats.

Every kind takes `show`, an `Expr`: `{"get": "key"}`, `not`, `all`, `any`, `eq`, `lt`, `len`, `has`, `is` (a named
pattern), `add`, `sub`, `mul`, `cat`, `pick`, or a bare value. `eval` is total: a wrong type gives `null`, and `null` is
false. `fixtures/behave/` holds its cases (state, expression, value), and an operation a reader does not know
evaluates to `null`.

A field also takes `show`, `enabled` and `checks` (each `{ok, say}`), a button and an act `enabled`, and a tap `set` (each
`{key, to}`: local state changes, nothing is sent). `behave::view` gives what a state makes of a screen: the hidden
ids and field names, the disabled ones (a form whose check fails, for its submit) and each failing field's `say`;
`behave.ts` and Swift's `Behaviour` give the same for `fixtures/behave/view.json`. A `show`, `enabled`, check or
`set` that uses an operation or pattern a reader does not know counts as not written. A block's `show` needs its
`id`. An act's `enabled` keys by the action it sends (`View.acts`); a row's or tile's `value` may be `{"get": key}`, which
shows that state key's text (`View.values`). The static page writes the start state: `hidden`, `disabled` acts, bound
values, and from checks `required`, `type="email"`, `maxlength`.

`fixtures/screens/` holds both apps' screens as they sent them, copied verbatim (cooee at `8ca09a316`, drover at
`dd475fcf0`), and `cooee/screen-tests-insert.json`, cooee's `ScreenTests` inserts written out as frames. Each
parses into the Rust types and serializes back equal, fits the schema, and decodes in Swift. None has a fault a
reader sees (a wrong shape, an unknown field or kind) but drover's `scene` of the herd, its own shape, which
becomes drover's app kind `herd`.

## Ops and the stream

An op names a block by its id: `merge` (fields over it), `insert` into a block's list (`before` an id, else `after`
one, else at the end), `move`, `remove`, `replace`, `badge` (the place's count), `dot` (its unread dot) and
`screen` (the whole screen). A container's list is `rows` for a list, `lanes` for a scene, `rounds` for a row, else
`blocks`.

One stream per device carries every key (a screen's path) it opens. The server's `Shelf` keeps each key's rev, its
JSON and a ring of its last 16 deltas (or 64 KB); the client's `Mirror` (the crate's, `web/src/stream.ts`'s) keeps
the rev it holds and the screen. The stream starts with `hello` (`v`, `sid`, `epoch`, `keys`); the client answers
with a `Sync` that opens its keys, each with its rev when its copy came from the same epoch, and the `Synced` reply
gives per key nothing (current), the ring's ops, the whole screen, or `gone`. A `Frame` (`k`, `from`, `rev`, `ops`)
applies only on rev `from`; one with no `from` carries the whole `screen`. A frame at or below the rev held is
dropped, one from above it is a gap (open the key again with the rev held), and one with an op the client does not
know is dropped and the key opened again with no rev. No order is assumed between the reply and the stream, so
`just sim` drops, doubles and reorders frames and checks the mirror converges; `fixtures/protocol/` holds the cases
both clients run. `wire::old` turns ops into the old per-screen stream's `{"seq", "ops"}` frames (`OldFrame`).

The media type names the format and the version, `application/vnd.blocks+json;v=1`. `MediaType::pick` reads an
`Accept` value and answers at the lower of the two versions, or refuses one more than one apart.

## Versioning

`SCHEMA_VERSION` (in `crates/blocks/src/lib.rs`, and in the schema's `$id`, `schemaVersion` in TS and
`blocksSchemaVersion` in Swift) is the wire's major version. It changes only with a breaking change.

| A newer server sends | Version | What an older client does |
|---|---|---|
| a kind it has no view for (new, another app's) | same | draws the block's `fallback`, then its children; keeps the JSON |
| a field it does not know | same | ignores it; keeps it |
| a `tone`, `style` or other word it does not know | same | draws the default of that field |
| an op it does not know | same | drops that frame and opens the key again with no rev: the server answers the whole screen |
| a removed or renamed field or kind, a changed type or meaning, a new required field | `SCHEMA_VERSION` + 1 | one version behind: the server writes the form before; further behind: keeps its last copy, shows `update the app` and stops syncing |

- An additive change (a new kind, op, field or word) keeps the version; every reader above must tolerate it.
- A breaking change bumps `SCHEMA_VERSION` and states the migration in the PR.
- Every change reruns `just gen` in the same PR, so the schema, TS and Swift never lag the Rust types.
