# blocks

The typed UI blocks a drover screen is made of, their row diff and ops, and the device stream protocol. It also holds
the codegen that turns the Rust types into JSON Schema, TS and Swift. Later it will hold the one HTML renderer cooee
embeds and the shared theme package. drover and cooee depend on this crate.

## Intent

- One definition of a screen: Rust types, with the schema, TS and Swift generated from them (`docs/schema.md`).
- Screens change by row ops: `diff` two screens, `apply` the ops, and resume a stream after a reconnect.
- Held to drover's standard from the first commit: every gate below runs in CI and in `just check`.

## Non-goals

- Not a general UI framework: only the blocks drover's screens need.
- No drover imports. drover depends on blocks, never the other way.
- No transport: no tokio, HTTP or sockets. Streams are carried by drover and cooee.

## Gates

`just check` runs them all locally (it needs `just`, `cargo-deny`, `actionlint`, node 24, and `drover` on PATH or in `$DROVER`).

- `just fmt`, `just clippy`: rustfmt, clippy pedantic, and the banned APIs (`.drover/rules.md`)
- `just fixtures`: each lint fixture in `ci/lint-fixtures/rust/` and `web/lint-fixtures/` must fail
- `just test`, `just perf`, `just soak`: the tests, the release perf budgets and the flat-memory soak
- `just sim 2000`: random op sequences on random screens, also run nightly (`.github/workflows/sim.yml`)
- `just deps`, `just deny`: the allow-list in `docs/deps.md`, then licences, advisories, duplicates and sources
- `just web`: strict tsc and `web/lint.mjs` on the generated TS
- `just arch`, `just cap`: drover's arch-check (`.drover/arch.toml`) and the line cap
- `just actionlint`, `just swift`: the workflows, and the Swift types on macOS

## Licence

MIT, see `LICENSE`.
