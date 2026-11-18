# blocks: the migration issues, in order (#2)

Three fleets. The orchestrator files each issue with a link to this folder. An issue in drover or cooee is blocked
on the blocks issue it needs (`drover queue <fleet> block --on blocks#N <issue>`) and starts by moving the pin.
Every move is "migrate the callers, then delete": the app's PR deletes its copy in the same PR that adopts ours.

## The order at a glance

```
blocks#1 ─> B1 ─> B2 ─┬─> B3 layout ──┬─────────────> B6 shell ─> (C6)
                      ├─> B4 theme ───┼─> B5 html ──┬─> B7 html gaps
                      │               └─> B8 swift ─┴─> B9 swift gap ─> B10 typed reads
drover:  #1318 slices 1–7 (B1, B2) ─> D1 (B4) ─> D2 (B5) ─> D3 (B3, B6) ;  D4 (B1) any time ;  D5 (C5) ;  D6 (D2, owner)
cooee:   C1 (B2) ─> C2 (B3) ─> C3 (B4) ─> C4 (B8) ─> C5 (B8, drover #1318 slice 4) ;  C6 (B6, B7, owner)
```

drover #1318 is the urgent path and needs only B1 and B2. Everything after B2 can run beside it.

## blocks

| # | Ships | From | Gate |
|---|---|---|---|
| blocks#1 | the gates and the placeholder crate | | lands first |
| **B1** the crate | `kind/` (22 kinds, the parts, the generated enum), `Built` and `check(app)`, `wire` (the op superset, `Action`, `Answer`, `old`), `diff` with `move`, `patch`, `shelf`, `mirror`; the root `Package.swift` and `package.json`; `fixtures/blocks`, `fixtures/screens` (both apps' goldens), `fixtures/protocol` | screen-hub's B1; cooee's schema; drover's `screens.rs` diff | every golden parses with no fault; `apply(a, ops(a, b)) == b`; blocks#1's perf, soak and sim on the real types |
| **B2** codegen and the page's two modules | `scripts/lists.sh`; the schema, `gen/types.ts` (with `Kind`), `Gen/Blocks.swift`, `blocks::SCHEMA`; `stream.ts`, `patch.ts`; `web.yml` | screen-hub's B2 | arch-check on the generated files; cooee's schema fixtures validate against the new schema; Swift decodes every fixture; TS runs `fixtures/protocol` |
| **B3** layout | `layout` (types, `Contract`, `check`, `merge`, `resolved`); the generated TS types; Swift `Layout` in `Blocks`; `fixtures/layouts` | cooee `layout.rs` (`check`, `merged`) and `CooeeCore/Layout.swift` with its 12 bad fixtures | Rust and Swift refuse each bad fixture with the same reason; cooee's default layout passes with cooee's contract (a fixture) |
| **B4** theme | `theme` (`Scheme`, `gate`, `Style`, `Theme`, `check_pack`); `theme/schemes` (12); `theme/packs` and `just swag`; `gen/schemes.ts`, `Gen/Schemes.swift`; Swift `Style`, `Scheme`; `fixtures/schemes`, `fixtures/styles` | cooee `look.rs` and `packs/fixtures/styles`; drover `docs/design/schemes/refused` | every built-in scheme and vendored pack passes the gate in CI; each bad fixture is refused; the packs match `SHA256SUMS` |
| **B5** HTML renderer | `render/<kind>.ts` for the 15 kinds drover draws, `gap(n)` for the rest; `theme.ts` (the port, `packs`); `blocks.css` | drover `web/src/blocks.ts`, `theme.ts`, the generic rules of `board.css` | `tsc` (the `Record<Kind, …>`); each `fixtures/blocks/*.json` drawn in a browser test without an error |
| **B6** HTML shell and the bundle | `shell.ts` (`mount`: the resolved layout as tabs, cards, sheet, menu; kept copies; actions; the look sheet); `web/dist`; `blocks::web` | the generic parts of drover `web/src/main.ts` | a browser test mounts a two-tab layout from fixtures and follows `fixtures/protocol`; arch-check on `web/dist` |
| **B7** HTML gaps | one issue per kind: `diagram`, `secret`, `config`, `web`, `diff`, `editor`, `scene`; and `rounds` on a row | cooee's views, as the reference for what each shows | no `gap(` left in `web/src/render`; needs a design stage (new drawings) |
| **B8** SwiftUI package | `Blocks`: `JSONValue`, `Mirror`; `BlocksUI`: `BlocksView` (the `Kind` switch, `appBlocks`), `SlotView` (with a component closure), `Look`, `Palette`, `Kinds/<Kind>.swift`; `Gap(n)` for `composer` | cooee `CooeeCore` (`JSONValue`, `Screen`) and `CooeeUI` (`Blocks`, `BlockRows`, `BlockLeaves`, `BlockCards`, `BlockActs`, `BlockFields`, `BlockEdits`, `BlockImages`, `BlockDiagram`, `BlockRounds`, `Stage`, `SlotView`, `Layout`, `Theme`, `ThemeColours`, `Look+Style`, the shared components) | `swift build` in Swift 6 mode, warnings as errors; every fixture drawn; `Mirror` runs `fixtures/protocol` |
| **B9** SwiftUI gap | `composer` | drover's `composer` in `render/composer.ts`, as the reference | no `Gap(` left; needs a design stage |
| **B10** typed reads | each renderer file reads its generated type, not keys (`--refactor`, one issue per renderer) | | the apps' goldens and frames unchanged |

## drover (fleet `herdsman`)

| # | Does | Deletes | Blocked on |
|---|---|---|---|
| #1318 slices 1–7 | as `screen-hub/adr.md`: the pin, tokio, the hub, the device stream, patch in place, lane tails, gates | the diff in `screens.rs`, `web/src/ops.ts`, the per-screen streams | B1 (slice 1), B2 (slice 4) |
| **D1** schemes | serve takes the built-in schemes from `blocks::theme` and gates the owner's own on load; the page takes `choose` and a scheme's CSS from the package | `assets/schemes/`, `web/src/schemes.ts` (the gate in the browser) | B4 |
| **D2** the renderer | the page draws through the package's `render`; the Herd block is renamed `herd` and registered as drover's kind; `web/src/theme.ts` becomes drover's `Theme` port over `legacy-board/` | `web/src/blocks.ts`, the generic rules of `board.css` | B5, #1318 slice 5 |
| **D3** the shell and `layout.json` | `main.ts` becomes one `mount`; the places list becomes drover's `layout.json`, checked by `blocks::layout::check` with drover's contract; `cooee-plugin.toml`'s places stay as they are | the generic parts of `web/src/main.ts`, the inlined `PL` | B3, B6, D2 |
| **D4** typed builders (`--refactor`) | the `json!` blocks in `screens.rs` and `serve/chat.rs` become the crate's constructors | about 170 `json!` blocks | B1; any time after #1318 slice 1 |
| **D5** the old stream route | | `GET /screens/<x>/stream`, the use of `wire::old` | C5 |
| **D6** drover's art onto `packs/` (open question 2) | the page's `Theme` is the package's `packs`; a design stage first | `assets/swag/`, `scripts/swag.sh`, drover's `Theme` port | D2, B4, the owner |

After D3 drover's `web/src` holds `main.ts` (the `mount` call), `herd.ts`, its pairing, alerts and timings.

## cooee

| # | Does | Deletes | Blocked on |
|---|---|---|---|
| **C1** the pin and the schema | `blocks` in `Cargo.toml` and `deny.toml`; `cooee plugin check` validates against `blocks::SCHEMA` (cooee keeps only its `attach` definition); `cooee-core/src/blocks.rs` builds with the crate's types | `docs/plugins/screens.schema.json` | B2 |
| **C2** layout | `cooee-server/src/layout.rs` keeps the file watch and the routes and calls `blocks::layout` with cooee's contract; the app decodes with `Blocks.Layout`; the SwiftPM pin and the pin test | the rules in `layout.rs` (`KINDS`, `PLACES`, `check`, `merged`), `CooeeCore/Layout.swift`, `LayoutTransition.swift`, the layout fixtures | B3 |
| **C3** theme | `look.rs` keeps the pack loading and calls `blocks::theme`; the first-party packs come from `blocks::theme::packs()` | the gate, `Scheme` and `Style` in `look.rs`; `design-system/schemes/`; `packs/swag.toml` and its build step; `packs/fixtures/styles`; `CooeeCore/Style.swift` | B4 |
| **C4** the SwiftUI package | `CooeeUI` draws through `BlocksView` and `SlotView`; cooee's own kinds (home, menu, persona, pairing, chats) are registered with `appBlocks`, its components through `SlotView`'s closure | `CooeeCore/JSONValue.swift`, `Screen.swift`; the `CooeeUI` files B8 lists (about 2,900 lines) | B8, C2, C3 |
| **C5** the device stream | the app follows drover's screens on `GET /stream` with `Mirror`; cooee-server's own screens publish through `Shelf` on the same protocol | `LiveScreen`'s own op code, the per-screen `{seq, ops}` streams | B8, drover #1318 slice 4 |
| **C6** the embedded HTML renderer (open question 1) | cooee-server serves `blocks::web`; the surface the owner names mounts it | whatever that surface draws by hand today | B6, B7, the owner |

cooee's snapshot frames are the gate of C2, C3 and C4: each passes them unchanged. C5 changes cooee's own stream
routes, so it should get a short ADR in cooee before it is queued.

## What each app holds at the end

| | drover | cooee |
|---|---|---|
| its data | the screen builders, the hub, the lane tails | the stores, the hub, core's screens |
| its kinds | `herd` | home, menu, persona, pairing and chat blocks |
| its layout | `layout.json` (tabs, cards, menu rows) | `layout.json` and its contract (`chat`, `sidebar`, `scanner`, `settings`, …) |
| its transport | serve on tokio, SSE | cooee-server, SSE |
| from blocks | everything else | everything else |
