# blocks

blocks is an opinionated UI framework whose screens are data: typed blocks, checked, then drawn by a renderer. It has
two modes. Mode A, server-driven (drover, cooee): a Rust server builds screens and sends row ops over the device
stream. Mode B, client-built (synergy): TS builders in a route loader build the screen and the React adapter draws it,
with no server and no stream; it uses the kinds, the generated types, the builders, check, `blocks.css` and the guard
kit, and not shelf, mirror, the stream, wire versioning or site.

Shipped: the crate (typed blocks, their row diff and ops, the device stream protocol) with the codegen that turns its
Rust types into JSON Schema, TS and Swift; the theme rules (scheme tokens, the gate, styles, the pack check) and one
neutral default pair; the SwiftUI package; the HTML renderer and shell, the static site renderer, and the headless
harnesses (`docs/architecture/blocks/migration.md`).

## Intent

- One definition of a screen: Rust types, with the schema, TS and Swift generated from them (`docs/schema.md`).
- Screens change by row ops in Mode A: `diff` two screens, `apply` the ops, and resume a stream after a reconnect.
- Held to drover's standard from the first commit: every gate below runs in CI and in `just check`.

## Non-goals

- No drover or cooee imports. They depend on blocks, never the other way.
- No transport: no tokio, HTTP or sockets. Streams are carried by drover and cooee.
- No named colour scheme or theme pack: those live in jirathip-dev/swag, which an app pins beside blocks.

## Gates

`just check` runs them all locally but `just sim`, whose fixed seeds run inside `just test` (it needs `just`, `cargo-deny`, `actionlint`, node 24, and `drover` on PATH or in `$DROVER`).

- `just fmt`, `just clippy`: rustfmt, clippy pedantic, and the banned APIs (`.drover/rules.md`)
- `just fixtures`: each lint fixture in `ci/lint-fixtures/rust/` and `web/lint-fixtures/` must fail
- `just test`, `just perf`, `just soak`: the tests, the release perf budgets and the flat-memory soak
- `just sim 2000`: random op sequences on random screens, then one seeded corpus of screens, ops and expressions through Rust, TS and Swift; also run nightly (`.github/workflows/sim.yml`)
- `just deps`, `just deny`: the allow-list in `docs/deps.md`, then licences, advisories, duplicates and sources
- `just web`: strict tsc and `web/lint.mjs` on `web/src` (the generated `gen/` and the hand-written renderer, stream
  and patcher), then the node tests in `web/test/`
- `just arch`, `just cap`: drover's arch-check (`.drover/arch.toml`), and the line cap: the highest `line_cap` in `ci/cap.toml`
  and `ci/cap.d/*.toml`, now 15,000 (`scripts/line-cap.sh`)
- `just actionlint`, `just swift`: the workflows, and the Swift package on macOS (op apply, the generated types, a
  render test per core kind), warnings as errors

## For agents

Start a screen with the usage skill `skill/blocks/` (an app's lanes get it from `blocks skill --to <dir>`), from an
example screen in `skill/blocks/examples/`, and check it headlessly with `blocks check` (`docs/guard.md`).

## The Swift package

The root `Package.swift` ships `Blocks` (the generated types, `JSONValue`, op `apply`, `Replica`: the ADR's Swift `Mirror`, renamed so it does not shadow Swift's own) and `BlocksUI`
(`BlocksView`, `.appBlocks` for an app's own kinds, `.blockStyle`). An app pins one commit, never a tag:
`.package(url: "https://github.com/jirathip-dev/blocks", revision: "<40 hex>")`.

## Licence

MIT, see `LICENSE`.
