Closes #19

B10 of `docs/architecture/blocks/migration.md`: the SwiftUI headless harness.

## What changed

- `BlocksUI`: `Tree.swift` adds one `Reported` modifier. It is applied in `BlockNode` next to `Styled` and on a list's rows. With `reportsBlocks()` set in the environment, it reports every drawn block as a tree node with its bounds and the action a tap sends. Apps don't set it, so they pay nothing (`package` access only).
- `BlocksSnapshot`: `Snapshot(screen, size:, look:)` with `.blockStyle`, `.appBlocks` and `.run(steps, name:, expect:, check:)`, which returns PNGs, trees, `Report` and faults. It draws with `ImageRenderer` at scale 2. Steps: `tap` sends the tapped block's registered action (one with no handler goes in `dropped`); `frame` and `answer` apply to the screen; `shot`. `type` and `scroll` go in `dropped` for now: scripted input is B11 (#20). `--check` is a port of B7's `same` and `fit`.
- `blocks-snap`: the CLI from `renderers.md` §6 (`--screen --size --scheme --script --expect --check --out`). It writes `<shot>.png`, `<shot>.tree.json` and `report.json`, and exits 1 when a check fails.
- Codegen (decision q2167): it also writes `fixtures/trees/swift/<kind>.json`, which is `tree::expect` with SwiftUI's native kinds (every core kind except composer, prose, hero, media, nav, island). These are generated, listed in `.drover/arch.toml`, and not hand-edited.
- `swift.yml`: runs `blocks-snap --check` on every `fixtures/blocks` file against its `fixtures/trees/swift` tree.
- `renderers.md`: one line names `fixtures/trees/swift/`.

## Decisions

- q2167: SwiftUI's native kinds differ from HTML's on 9 kinds (B14 and B15 close the gap), so `--check` runs against `fixtures/trees/swift`. The test also asserts that each tree's kind, id, variant and order equal `fixtures/trees`.
- The tree is reported by a separate `Reported` modifier next to `Styled`, rather than inside `Styled`. Putting `Styled` on list rows would start applying an app's `row` style to them, which would be a visual change.
- `src/ net +328 (budget +250)`: Swift +316, Rust +12. The budget's estimate had no CLI, and the `--check` port plus the PNG writer account for the difference. The repo total after this PR, merged with current staging, is 11534 / 13500.
- Staging merge fix: staging (#18) replaced the named colour schemes with one default light/dark pair, so `blocks-snap --scheme` now takes `light` or `dark` (`--scheme farm` exits 2, `no scheme farm`). `.drover/arch.toml`'s `generated` list keeps both sides' entries.

## Evidence (head `6fc5a01b48732f48663ae265b2eef6a6823b0806`, staging merged in)

| Command | Exit |
|---|---|
| `BLOCKS_STRICT=1 swift test` (27 tests, 4 new in `SnapshotTests`) | 0 |
| swift.yml's new step: `swift build --product blocks-snap` then `blocks-snap --screen fixtures/blocks/$k.json --expect fixtures/trees/swift/$k.json --check` for all 27 | 0 |
| `blocks-snap --screen fixtures/blocks/list.json --expect fixtures/trees/card.json --check` (negative) | 1, `list: drew list#rows native, expected card#card native` |
| `cargo fmt --check` | 0 |
| `cargo clippy --workspace --all-features -- -D warnings` | 0 |
| `cargo test --workspace --all-features --locked` | 0 |
| `drover arch-check --base origin/staging` | 1: only its `just gen` step, `just` absent on this host; `cargo run -p blocks --features schema --bin blocks-codegen` run directly left no drift |
| `sh scripts/line-cap.sh` / `line-cap.test.sh` / rules ≤ 30 | 0 / 0 / 0 |
| `scripts/deps-gate.sh`, `scripts/lint-fixtures.sh rust` | 0, 0 (at c40d2e9; no deps or lint fixtures changed since) |

Not run locally: `actionlint` and `cargo deny` aren't installed on this host, so CI runs them. No dependency changed. `just` isn't installed either: I ran each recipe's commands directly, and arch-check's `just gen` went through a lane-local shim that runs the same cargo command. I didn't run perf, soak or the web gate: this PR changes no Rust runtime code (codegen only) and no web file.

## For humans

SwiftUI screens can now be drawn headlessly, with a picture, the drawn tree and a report, from tests or from the new `blocks-snap` command. This mirrors what the web harness does.
CI now checks that every sample block draws in SwiftUI as expected: each block is present, has a size, stays inside the screen and overlaps no sibling.
Typing and scrolling in scripts come with the behaviours slice (#20).

## Why (round 1)

Decided: SwiftUI checks against generated fixtures/trees/swift, and its tree's kind/id/variant/order must equal fixtures/trees
Because: q2167
Because: crates/blocks/src/codegen.rs:81
Decided: the tree is reported by a Reported modifier beside Styled, applied in BlockNode and on a list's rows
Because: swift/Sources/BlocksUI/Blocks.swift:140
Rejected: reporting inside Styled and putting Styled on list rows — an app's row style would start drawing on list rows, a visual change
Decided: type and scroll steps go in report.dropped until B11 brings scripted input
Because: docs/architecture/blocks/migration.md:54
Decided: merged staging (B14, B52) and kept both sides of renderers.md's --check paragraph
Check: swift.yml's new step runs blocks-snap --check on all 27 fixtures; SnapshotTests covers check, the negative case, a tap, an answer and blockStyle
Owner: SwiftUI screens can be drawn headlessly (picture, tree, report), and CI checks every sample block draws as expected.

<sub>note on 0f66d98 · git log --notes=why</sub>

