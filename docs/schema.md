# The wire schema

The Rust types in `crates/blocks/src/` (`Block` and its kinds, `Op`, `Frame`) are the one source.
`just gen` derives the rest, and CI's arch-check fails a PR whose generated files differ from what it writes:

- `schema/blocks.schema.json`: the JSON Schema of a `Frame`, the stream's one message; `$defs/Block` is a block
- `schema/sample.json`: frames serialized by the Rust code, which the Swift test decodes
- `web/src/gen/types.ts` and `web/src/gen/sample.ts`: the TS types, and the sample type-checked against them
- `swift/Sources/Blocks/Gen/Blocks.swift`: the Swift `Codable` types (`JSONValue.swift` beside it is kept by hand)
- `swift/Sources/Blocks/Gen/Style.swift`: `theme::Style`, an app's `style.json`, which `fixtures/styles/` holds good and bad

## Blocks

A block is a JSON object whose `type` names its kind, as drover and cooee send it: `{"type": "row", "title": "Hi"}`.
The core kinds are the superset of both apps': cooee's 21 (`screen`, `sheet`, `section`, `list`, `row`, `card`,
`choice`, `form`, `config`, `secret`, `run`, `button`, `chips`, `stat`, `text`, `images`, `web`, `diff`, `editor`,
`scene`, `diagram`) and drover's `composer`, with every field either app sends. Any other `type` is an app's own
kind (`AppBlock`): it is kept whole, and may carry a `fallback` row. A core kind of the wrong shape is refused, by
the types and by the schema.

`fixtures/screens/` holds both apps' screens as they sent them, copied verbatim (cooee at `8ca09a316`, drover at
`dd475fcf0`), and `cooee/screen-tests-insert.json`, cooee's `ScreenTests` inserts written out as frames. Each
parses into the Rust types and serializes back equal, fits the schema, and decodes in Swift.

## Ops and the stream

An op names a block by its id: `merge` (fields over it), `insert` into a block's list (`before` an id, else `after`
one, else at the end), `move`, `remove`, `replace`, `badge` (the place's count), `dot` (its unread dot) and
`screen` (the whole screen). A container's list is `rows` for a list, `lanes` for a scene, `rounds` for a row, else
`blocks`.

A `Stream` sends `Frame`s, `{"seq", "ops"}`. A frame that starts with a `screen` op stands alone; any other must
follow the last frame applied. A receiver that reconnects asks to resume from its last `seq`. It gets the logged
frames when the stream still holds them, else one `screen` frame. Either way it converges to the same screen, and
the sim (`just sim`) checks that on random op sequences.

## Versioning

`SCHEMA_VERSION` (in `crates/blocks/src/lib.rs`, and in the schema's `$id`, `schemaVersion` in TS and
`blocksSchemaVersion` in Swift) is the wire's major version. It changes only with a breaking change.

| A newer server sends | Version | What an older client does |
|---|---|---|
| a kind it has no view for (new, another app's) | same | draws the block's `fallback`, then its children; keeps the JSON |
| a field it does not know | same | ignores it; keeps it |
| a `tone`, `style` or other word it does not know | same | draws the default of that field |
| an op it does not know | same | drops that frame and asks for the whole screen |
| a removed or renamed field or kind, a changed type or meaning, a new required field | `SCHEMA_VERSION` + 1 | one version behind: the server writes the form before; further behind: keeps its last copy and shows `update the app` |

- An additive change (a new kind, op, field or word) keeps the version; every reader above must tolerate it.
- A breaking change bumps `SCHEMA_VERSION` and states the migration in the PR.
- Every change reruns `just gen` in the same PR, so the schema, TS and Swift never lag the Rust types.
