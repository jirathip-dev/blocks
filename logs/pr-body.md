Closes #16

## For humans
Pages built on blocks now get a ready-made shell: tabs, a menu, sheets, toasts and a confirm box drawn from the layout file, with each screen kept on the device and kept live from the server.
A server with no Node can now serve that page script and its style straight from the Rust crate.
Owners can pick a colour scheme in a new "look" sheet, and the choice is remembered on that device.

## What
- `web/src/shell.ts`: `mount({ root, layout, url, blocks, components, css, theme, store })`. Strip nodes are tabs (hash-routed), `cards`/`column`/`panel`/`inline` always shown, `menu`/`sheet`/`push` rows in the menu sheet, `hidden` skipped; one stream per source via `stream.ts`, frames through `patch.ts`'s patcher; kept copies painted before the stream answers; actions POST `url(source, "/action")` with confirm, answer ops / open / close / toast; the look sheet (built-in schemes, stored); the app's `css` links; `AppBlocks` makes a core kind name a compile error. Re-exports `el`, `h`, `kids`, `render`, `packs`, `plain`.
- `web/dist/blocks.{js,css}`: built by `npm run build` (esbuild 0.28.2 exact, approved in q2139); `just gen` now runs it after codegen; listed as generated in `.drover/arch.toml`; the `rust` CI job sets up Node since arch-check runs `just gen`.
- `blocks::web::{JS, CSS}` (`crates/blocks/src/web.rs`), its own arch layer.
- codegen: `ts_defs` split out of `ts`; writes `web/src/gen/layout.ts` (`LayoutPlace`, `LayoutTransition`), the TS twin of `LayoutShapes.swift`.
- Shell style rules in `blocks.css`.

## Decisions
- The layout node type in TS is hand-written in `shell.ts` (the Rust `Node` has a custom `Serialize`, no schema); its place/transition words are generated.
- A tab switch opens the new key before closing the old one, so `stream.ts` keeps the one EventSource.

## Evidence (head ef0e15441abca445602abdd014bc3477077b0e50)
`just` is not installed on the lane host, so each recipe's commands ran directly:
- `cargo fmt --check`: 0
- `cargo clippy --workspace --all-features --lib --bins --locked -- -D warnings`: 0; `--tests` with the test allow-list: 0
- `cargo test --workspace --all-features --locked`: 0 (incl. new `tests/web.rs`)
- `npm --prefix web run check && run lint && run test`: 0 (incl. new `test/shell.test.ts`, 5 tests)
- `scripts/lint-fixtures.sh rust` / `ts`: 0 / 0
- perf (`--release --test perf --ignored`): 0; soak: 0; `BLOCKS_SIM_N=500` sim: 0
- `scripts/deps-gate.sh`: 0; `sh scripts/line-cap.sh`: 0 (8665 / 10000); `line-cap.test.sh`: 0
- `drover arch-check --base origin/staging` with a scratch `just` shim running the gen recipe's three commands: 0 (323 files, 0 violations); the esbuild rebuild is byte-identical
- Not run locally: `cargo deny` (not installed; no Cargo dependency changed), swift (no Swift change), actionlint (not installed)

src/ net +376 (budget +410): Rust +16, TS +360; under budget.
