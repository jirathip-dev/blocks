# The wire schema

The Rust types in `crates/blocks/src/` (`Block` and its kinds in `kind/`, `Expr` in `expr.rs`, `Op`, `Action`,
`Answer` and the stream's messages in `wire`) are the one source.

| section | what it holds |
|---|---|
| [Generated files](schema/generated.md) | what `just gen` derives and where it writes it |
| [Blocks](schema/blocks.md) | the kinds, app kinds, `Built` and the apps' screens |
| [Behaviours](schema/behaviours.md) | `show`, `enabled`, checks and `set` |
| [Ops and the stream](schema/stream.md) | the ops, the stream and the media type |
| [Versioning](schema/versioning.md) | `SCHEMA_VERSION` and what an older client does |
