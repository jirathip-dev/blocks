# Versioning

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
