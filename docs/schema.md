# The wire schema

The Rust types in `crates/blocks/src/` (`Screen`, `Row`, `Block`, `Op`, `Frame`, `Body`) are the one source.
`just gen` derives the rest, and CI's arch-check fails a PR whose generated files differ from what it writes:

- `schema/blocks.schema.json`: the JSON Schema of a `Frame`, the stream's one message
- `schema/sample.json`: frames serialized by the Rust code, which the Swift test decodes
- `web/src/gen/types.ts` and `web/src/gen/sample.ts`: the TS types, and the sample type-checked against them
- `swift/Sources/Blocks/Gen/Blocks.swift`: the Swift `Codable` types

Enums are externally tagged (`{"text": {"text": "Hi"}}`), so Swift's synthesized `Codable` reads them with no hand
code.

## The stream

A `Stream` sends `Frame`s; each carries a `seq`. A snapshot frame replaces the receiver's screen, and an ops frame
must follow the last frame applied. A receiver that reconnects asks to resume from its last `seq`. It gets the logged
ops frames when the stream still holds them, else one snapshot. Either way it converges to the same screen, and the
sim (`just sim`) checks that on random op sequences.

## Versioning

`SCHEMA_VERSION` (in `crates/blocks/src/lib.rs`, and in the schema's `$id`, `schemaVersion` in TS and
`blocksSchemaVersion` in Swift) is the wire's major version.

- An additive change (a new `Block` or `Op` variant, a new optional field) keeps the version. Readers must
  tolerate it: a renderer draws an unknown block as nothing, never as an error.
- A breaking change (removing or renaming a field or variant, changing a field's type or meaning, making an optional
  field required) bumps `SCHEMA_VERSION` and states the migration in the PR.
- Every change reruns `just gen` in the same PR, so the schema, TS and Swift never lag the Rust types.
