# blocks

blocks is an opinionated UI framework whose screens are data: typed blocks, checked, then drawn by a renderer. It has
two modes. Mode A, server-driven (drover, cooee): a Rust server builds screens and sends row ops over the device
stream. Mode B, client-built (a client-built app): TS builders in a route loader build the screen and the React adapter draws it,
with no server and no stream; it uses the kinds, the generated types, the builders, check, `blocks.css` and the guard
kit, and not shelf, mirror, the stream, wire versioning or site.

Shipped: the crate (typed blocks, their row diff and ops, the device stream protocol) with the codegen that turns its
Rust types into JSON Schema, TS and Swift; the theme rules (scheme tokens, the gate, styles, the pack check) and one
neutral default pair; the SwiftUI package; the HTML renderer and shell, the static site renderer, and the headless
harnesses (`docs/architecture/blocks/migration.md`).

## Intent

- One definition of a screen: Rust types, with the schema, TS and Swift generated from them (`docs/schema.md`).
- Screens change by row ops in Mode A: `diff` two screens, `apply` the ops, and resume a stream after a reconnect.
- Held to drover's standard from the first commit: every gate below runs in CI and in `./.gatekeeper/run check`.

## Non-goals

- No drover or cooee imports. They depend on blocks, never the other way.
- No transport: no tokio, HTTP or sockets. Streams are carried by drover and cooee.
- No named colour scheme or theme pack: those live in jirathip-dev/swag, which an app pins beside blocks.

## Gates

`./.gatekeeper/run check` (or `just check`) runs every gate, the same command as CI's `gates / done` and `drover turn
done`; the wrapper fetches the pinned gatekeeper (`.gatekeeper/config.toml`), so only the repo's toolchains are needed:
Rust, node 24 and WebKit for the web gates. `./.gatekeeper/run list` names them; `--gate <id>` reruns one.

- gatekeeper's packs: `core` (pin, arch-check on `.drover/arch.toml`, the line cap in `ci/cap.toml`, the rules file,
  actionlint, the dependency list in `.gatekeeper/deps.toml`), `rust` (fmt, clippy pedantic and the banned APIs, the
  lint floor and its fixtures, cargo-deny) and `ts` (tsc strict, oxlint, knip; their old findings in
  `.gatekeeper/baseline/`, which only shrinks)
- `.gatekeeper/gates/`, blocks' own: `test`, `gen` (in CI; core/arch runs the generator on a lane), `guard` (`blocks check`), `perf` and `soak` in release, `no-egui` (the
  `blocks` crate's tree), `for-apps`, `web` (`web/lint.mjs`, the node tests, the lint fixtures, the token baseline),
  `react` (the adapter's contract) and `bench` (`bench/` builds)
- `just sim 2000`: random op sequences on random screens, then one seeded corpus through Rust, TS and Swift; also run
  nightly (`.github/workflows/sim.yml`)
- outside gatekeeper for now: `just swift` and `swift.yml` (the Swift package on macOS), `desktop.yml` (the desktop
  renderer on Linux, Windows and macOS), `egui-demo.yml` and `compat.yml` (the last release against today's fixtures)

## For agents

Start a screen with the usage skill `skill/blocks/` (an app's lanes get it from `blocks skill --to <dir>`), from an
example screen in `skill/blocks/examples/`, and check it headlessly with `blocks check --shot` (`docs/guard.md`).

## The Swift package

The root `Package.swift` ships `Blocks` (the generated types, `JSONValue`, op `apply`, `Replica`: the ADR's Swift `Mirror`, renamed so it does not shadow Swift's own) and `BlocksUI`
(`BlocksView`, `.appBlocks` for an app's own kinds, `.blockStyle`). An app pins a release tag, the
`v<SCHEMA_VERSION>.<n>` the release workflow cuts on a green `main`:
`.package(url: "https://github.com/jirathip-dev/blocks", exact: "<tag>")`.

An app block is built from public pieces: `BlockNode` and `BlockStack` (blocks inside it), `ActButton` with a `Source`
(a tap or action), `MenuItems` (acts as menu buttons), `RelativeValue` (a text redrawn each minute), the `card`
environment entry's `CardContext`, `Refreshing` (pull to refresh) and `LayoutTransition.entering`. An app with its own
`Look`, `Palette` or `look` entry keeps them: its own names shadow BlocksUI's, and `.blocksLook(Look(palette:
Palette(...), tiles: nil))` hands BlocksUI the app's colours with no dot grid and no build-up. A menu screen stays the
app's own: its rows (an account, settings groups) are no core kind.

## Licence

MIT, see `LICENSE`.
