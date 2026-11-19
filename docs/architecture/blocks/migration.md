# blocks: the migration issues, in order (#2)

Three fleets. The orchestrator files each new issue with a link to this folder. An issue in drover or cooee is
blocked on the blocks issue it needs (`drover queue <fleet> block --on blocks#N <issue>`) and starts by moving the
pin. Every move is "migrate the callers, then delete": the app's PR deletes its copy in the PR that adopts ours.

## The existing issues

Closed: blocks#1, #4, #5, #6 and #7; #13 and #27 have merged since. Four slices were split after the ADR: B1b, B4b,
B9b and B16b.

| Issue | Is slice | State |
|---|---|---|
| blocks#1 | the gates | closed |
| blocks#7 | the cap, 10,000 | closed; the budget below is against it |
| blocks#4 | B1, first part: typed blocks and ops, the schema, generated TS and Swift | closed; the rest is B1b (#26) |
| blocks#6 | B4, first part: schemes, tokens, swag packs | closed; the rest was B4b (#27, merged) |
| blocks#5 | B9: the SwiftUI package, op apply and `Replica` | closed; the stream follower is B9b (#28) |
| blocks#13 | B2 | merged |
| blocks#27 | B4b | merged |
| cooee#621, #624, #622, #620, #615 | C1, C2, C3, C4, half of C5 | their blockers, below |

## The order at a glance

```
merged:  #1, #7 ─> B1 (#4) ;  B2 (#13) ;  B4 (#6, #27) theme ;  B9 (#5) swift
B2 ─┬─> B3 (#14) layout ──────────────────────┐
    └─> B9b (#28) swift follower               │
B1b (#26), B2, B4 ─> B5 (#15) html ───────────┴─> B6 (#16) shell ─> B7 (#17) shot ─> B8 (#18) site (B1b) ─┐
B7, B9, B1b ─> B10 (#19) snap ────────────────────────────────────────────────────────────────────────────┴─> B11 (#20) behaviours (B1b) ─> B12 (#21) islands (B1b)
B5 ─> B14 (#23) diagram ─> B14 (#38–#44, with B7) ;  B1b ─> B15 (#24) ;  B5, B7 ─> B16 (#25) ;  B10, B15 ─> B16b (#30)
B13 compat (from the first tag, q2100)
drover:  #1318 slices 1–3 (nothing) ;  slice 4 the pin (B1b, B2) ;  slice 6 (B2, B1b) ─> D1 (B4) ─> D2 (B5) ─> D3 (B3, B6) ;  D4 (B1b) ;  D5 (C5) ;  D6 (owner) ;  D7 (B7)
cooee:   C1 (B1b, B2) ─> C2 (B3) ─> C3 (B4) ─> C4 (B9) ─> C5 (B9b, #1318 slice 4) ;  C6 (B6, owner) ;  C7 (B10)
```

drover #1318 is the urgent path and needs only B1b and B2. Everything after B2 can run beside it.

## blocks

| # | Ships | From | Gate |
|---|---|---|---|
| **B1** = blocks#4 (closed) and **B1b** = blocks#26, the crate | `expr` (with `eval`), `kind/` (27 kinds, the parts, `Fallback`, the `kind!` macro, typed samples), `Built::of` and `check(app)`, `wire` (the op superset, `Action`, `Answer`), `diff` with `move`, `patch`; codegen: the schema, `types.ts`, `hooks.ts`, `Blocks.swift`, `fixtures/blocks`; the root `Package.swift` and `package.json`; `fixtures/screens` (both apps' goldens), `fixtures/behave` | screen-hub's B1; cooee's schema; drover's `screens.rs` diff | every golden parses with no fault; `apply(a, ops(a, b)) == b`; blocks#1's perf and sim on the real types; arch-check on the generated files; the `json!` ban |
| **B2** = blocks#13 (merged), the stream protocol | `shelf`, `mirror`, `Frame`, `Hello`, `Sync`, `Format`, `MediaType`, `wire::old`; `stream.ts`, `patch.ts`; `fixtures/protocol` with the version cases; `web.yml` | screen-hub's B1 and B2 | soak; sim with dropped, doubled and reordered frames; Rust and TS run `fixtures/protocol` |
| **B3** = blocks#14, layout | `layout` (types, `Contract`, `check`, `merge`, `resolved`); Swift `Layout` in `Blocks` on generated shapes; `SlotView` in `BlocksUI`; `fixtures/layouts` | cooee `layout.rs`, `CooeeCore/Layout.swift` with its 12 bad fixtures, and `CooeeUI`'s `SlotView` and `Layout` | Rust and Swift refuse each bad fixture with the same reason; cooee's default layout passes with cooee's contract (a fixture) |
| **B4** = blocks#6 and **B4b** = blocks#27 (both merged), theme | `theme` (`Scheme`, `gate`, `Style` with `space` and `motion`, `Theme`, `check_pack` over the schemes it is handed, `css`), the default pair (#53); the generated pair; `fixtures/schemes`, `fixtures/styles`, `fixtures/packs` (test inputs). The 12 schemes and the 3 packs went to swag's crate (#54, q2115) | cooee `look.rs` and `packs/fixtures/styles`; drover `docs/design/schemes/refused` | the default pair passes the gate; the fixture pack passes `check_pack`; each bad fixture is refused. swag's CI gates its own schemes and packs with this crate |
| **B5** = blocks#15, HTML renderer | `render/<kind>.ts` for the 15 kinds drover draws, with the hooks; `gap(n)` for the rest; `theme.ts`; `blocks.css` in `@layer blocks` | drover `web/src/blocks.ts`, `theme.ts`, the generic rules of `board.css` | `tsc` (the `Record<Kind, …>`); drover's page goldens unchanged (classes and attributes are only added) |
| **B6** = blocks#16, HTML shell and the bundle | `shell.ts` (`mount`: the resolved layout as tabs, cards, sheet, menu; kept copies; actions; the look sheet; an app's `css`); `web/dist`; `blocks::web` | the generic parts of drover `web/src/main.ts` | arch-check on `web/dist`; B7 then mounts a two-tab layout and follows `fixtures/protocol` |
| **B7** = blocks#17, HTML headless | `tree` (`Node`, `Step`, `Report`, `expect`), `fixtures/trees`; `dump.ts`; `web/shot` (`blocks-shot`, `shot()`); this repo's `.drover/verify.md` | drover `crates/cli/tests/support/webview.mjs`, as the reference | every `fixtures/blocks` file passes `--check` in WebKit; first paint of the 200-row screen under 300 ms warm |
| **B8** = blocks#18, websites | `site` (a writer per kind, `page`, `Head`), `Action::from_form`, `fixtures/html`, `fixtures/site`; `prose`, `hero`, `media`, `nav` in `render/`; adopting in `shell.ts` | | the two writers give the same element per kind; the fixture site with JS off: links go, a form posts; PNG and tree equal before and after `blocks.js` |
| **B9** = blocks#5 (closed), SwiftUI package | `Blocks`: `JSONValue`, op `apply`, `Replica` (the ADR's Swift `Mirror`: a public `Mirror` would shadow Swift's own); `BlocksUI`: `BlocksView` (the `Kind` switch, `appBlocks`, the one wrapper, `BlockStyle`), `Look`, `Palette`, `Kinds/<Kind>.swift`; `Gap(n)` for `composer` and the content kinds | cooee `CooeeCore` (`JSONValue`, `Screen`) and `CooeeUI` (`Blocks`, `BlockRows`, `BlockLeaves`, `BlockCards`, `BlockActs`, `BlockFields`, `BlockEdits`, `BlockImages`, `BlockDiagram`, `BlockRounds`, `Stage`, `Theme`, `ThemeColours`, `Look+Style`, the shared components) | `swift build` in Swift 6 mode, warnings as errors; a render test per kind |
| **B9b** = blocks#28, the Swift stream follower | `Replica` moves to the B2 protocol (hello, have, frame, synced), a port of the crate's `mirror` | the crate's `mirror` | `Replica` runs `fixtures/protocol` |
| **B10** = blocks#19, SwiftUI headless | `BlocksSnapshot` (`Snapshot`: PNG, tree, steps), `blocks-snap` | cooee `Tests/CooeeUITests/Frames.swift` and `SnapshotTests.swift`, as the reference | every `fixtures/blocks` file passes `--check`; its tree equals the one B7's harness gives |
| **B11** = blocks#20, behaviours | `behave` (`view`); `behave.ts`; Swift `eval` and `view`; `site` writes `hidden`, `required`, `type`, `maxlength` | | `fixtures/behave` has one value in Rust, TS and Swift; scripted typing and taps in both harnesses; sim: no expression panics |
| **B12** = blocks#21, islands | `island.ts`; the Swift registry; `site`'s element with its fallback; a test component `x-echo` in both harnesses | | props in, a named event out as an action, an unnamed one dropped, the fallback with no component and on the static page |
| **B13** compatibility | the release tag rule in `docs/consume.md`; `release.yml`; `compat.yml`; a `fixtures/protocol` case per version rule | | the last release's crate and TS pass today's `fixtures/protocol`, and its `blocks-shot` and `blocks-snap` today's fixtures once a release carries them. Starts at the first tag, not after B12 (q2100) |
| **B14** HTML gaps | `diagram` first, blocks#23 (drover's server sends it); then one issue per kind: `scene` (#38), `secret` (#39), `config` (#40), `web` (#41), `diff` (#42), `editor` (#43), and `rounds` on a row (#44) | cooee's views, as the reference | no `gap(` left in `web/src/render`; a design stage each (new drawings) |
| **B15** = blocks#24, SwiftUI gaps | `composer`; `prose`, `hero`, `media`, `nav` | drover's `composer`, the HTML content kinds, as the reference | no `Gap(` left; a design stage |
| **B16** = blocks#25 (HTML) and **B16b** = blocks#30 (SwiftUI), typed reads | each renderer file reads its generated type, not keys (`--refactor`, one issue per renderer) | | the apps' goldens and frames unchanged |

## The line budget (blocks#7: 10,000)

Non-test, non-generated lines of Rust, TS and Swift, as the cap counts them. The moved code is measured (drover
`web/src` at `dd475fcf0`, cooee `apple/Sources` at `4e831d972`); the new code is estimated.

| Slice | Rust | TS | Swift | Total after it |
|---|---|---|---|---|
| B1 (#4) and B1b (#26) (replaces blocks#1's 470) | 1,750 | | | 1,750 |
| B2 (#13) | 410 | 240 | | 2,400 |
| B3 (#14, with `SlotView` out of B9's Swift) | 330 | | 130 | 2,860 |
| B4 (#6) and B4b (#27) | 420 | | 80 | 3,360 |
| B5 (#15) | | 680 | | 4,040 |
| B6 (#16) | 10 | 400 | | 4,450 |
| B7 (#17) | 120 | 260 | | 4,830 |
| B8 (#18) | 650 | 160 | | 5,640 |
| B9 (#5) and B9b (#28) | | | 3,110 | 8,750 |
| B10 (#19) | | | 250 | 9,000 |
| B11 (#20) | 80 | 150 | 150 | 9,380 |
| B12 (#21) | 20 | 50 | 40 | 9,490 |
| B15 (#24) | | | 260 | 9,750 |
| B14, `diagram` (#23) | | 150 | | 9,900 |
| B14, the other kinds (#38–#44) | | 250 | | 10,150: over |
| B16 (#25) and B16b (#30) | lines given back | | | under 10,150 |

- Every amendment fits. What does not is the last 250 lines: HTML views for kinds no web page shows today. They
  keep drawing their fallback on the web (ADR open question 1).
- The estimate is good to one part in ten. If it runs over earlier, what waits, in order: B14's other kinds, B15's
  content kinds (no website is drawn in SwiftUI yet), B15's `composer`. A lane trims first and asks only when its
  own PR would cross the cap.
- What keeps it this low: the shapes are written once in Rust and generated (not counted) for TS and Swift, so
  cooee's 570 lines of hand-written Swift models become about 210; expressions need no parser; B16 and B16b should give
  lines back as views stop reading keys.

## drover (fleet `herdsman`)

| # | Does | Deletes | Blocked on |
|---|---|---|---|
| #1318 slices 1–7 | as `screen-hub/adr.md`: the pin, tokio, the hub, the device stream, patch in place, lane tails, gates | the diff in `screens.rs`, `web/src/ops.ts`, the per-screen streams | slices 1–3: nothing from blocks; slice 4 (the pin) needs N1: B1b (#26) and B2 (#13, merged); slice 6 needs N2: `stream.ts` and `patch.ts` (B2, #13, merged) and the generated types (B1b, #26) |
| **D1** schemes | serve takes the named schemes from swag's crate (`swag::schemes()`, pinned beside blocks, q2115), parses them as `blocks::theme::Scheme` and gates them and the owner's own on load; the page hands them to the shell (`mount`'s `schemes`) and takes a scheme's CSS from the package | `assets/schemes/`, `web/src/schemes.ts` (the gate in the browser) | B4 (#6, #27, merged) |
| **D2** the renderer | the page draws through the package's `render`; the Herd block becomes `AppBlock` `herd` with a fallback; drover's own rules become `drover.css` on the hooks; `web/src/theme.ts` becomes drover's `Theme` port over `legacy-board/` | `web/src/blocks.ts`, the generic rules of `board.css` | B5 (#15), #1318 slice 5 |
| **D3** the shell and `layout.json` | `main.ts` becomes one `mount`; the places list becomes drover's `layout.json`, checked by `blocks::layout::check` with drover's contract | the generic parts of `web/src/main.ts`, the inlined `PL` | B3 (#14), B6 (#16), D2 |
| **D4** typed builders (q2063) | the `json!` blocks in `screens.rs` and `serve/chat.rs` become the crate's constructors; a `json!` ban on those paths in drover's `arch.toml` | about 170 `json!` blocks | B1b (#26); any time after #1318 slice 1 |
| **D5** the old stream route | | `GET /screens/<x>/stream`, the use of `wire::old` | C5 |
| **D6** drover's art onto `packs/` (open question 4) | the page's `Theme` is the package's `packs`, over swag's `packs/` served from swag's crate; a design stage first | `assets/swag/`, drover's own `scripts/swag.sh`, drover's `Theme` port | D2, B4 (merged), the owner |
| **D7** headless (q2058) | `.drover/verify.md` and the WebKit tests of blocks screens call `blocks-shot`; the perf gates (q2019) read its `report.json` | `webview.mjs` where it drives a blocks screen | B7 (#17), D3 |

After D3 drover's `web/src` holds `main.ts` (the `mount` call), `herd.ts`, `drover.css`, its pairing, alerts and timings.

## cooee

| # | Does | Deletes | Blocked on |
|---|---|---|---|
| **C1** = cooee#621, the pin and the schema | `blocks` in `Cargo.toml` and `deny.toml`; `cooee plugin check` validates against `blocks::SCHEMA` (cooee keeps only its `attach` definition); `cooee-core/src/blocks.rs` builds with the crate's types; the `json!` ban on its builders | `docs/plugins/screens.schema.json` | B2 (#13, merged), B1b (#26) |
| **C2** = cooee#624, layout | `cooee-server/src/layout.rs` keeps the file watch and the routes and calls `blocks::layout` with cooee's contract; the app decodes with `Blocks.Layout`; the SwiftPM pin and the pin test | the rules in `layout.rs`, `CooeeCore/Layout.swift`, `LayoutTransition.swift`, the layout fixtures | B3 (#14) |
| **C3** = cooee#622, theme | `look.rs` keeps the pack loading and calls `blocks::theme`; the first-party schemes and packs come from swag's crate (`swag::schemes()`, `swag::packs()`), pinned beside blocks (q2115), parsed with blocks' types and checked with `check_pack` | the gate, `Scheme` and `Style` in `look.rs`; `design-system/schemes/`; `packs/swag.toml` and its build step; `packs/fixtures/styles`; `CooeeCore/Style.swift` | B4 (#6, merged), B4b (#27, merged) |
| **C4** = cooee#620, the SwiftUI package | `CooeeUI` draws through `BlocksView` and `SlotView`; cooee's own kinds (home, menu, persona, pairing, chats) are `AppBlock`s with fallbacks, registered with `appBlocks`; its components go through `SlotView`'s closure | `CooeeCore/JSONValue.swift`, `Screen.swift`; the `CooeeUI` files B9 and B3 list (about 2,800 lines) | B9 (#5, merged), C2, C3 |
| **C5** the device stream: cooee#615 (the server half) and cooee#631 (the app half) | the app follows drover's screens on `GET /stream` with `Replica`; cooee-server's own screens publish through `Shelf` on the same protocol | `LiveScreen`'s own op code, the per-screen `{seq, ops}` streams | the app half: B9b (#28); both: drover #1318 slice 4 |
| **C6** the embedded HTML renderer (open question 3) | cooee-server serves `blocks::web`; the surface the owner names mounts it | whatever that surface draws by hand today | B6 (#16), the owner |
| **C7** headless (q2058) | the snapshot frames of blocks screens and the verify recipe use `BlocksSnapshot` | `Pixels` and `Frame.render` in `Tests/CooeeUITests`, for those frames | B10 (#19), C4 |

cooee's snapshot frames are the gate of C2, C3 and C4: each passes them unchanged. C5 changes cooee's own stream
routes, so it should get a short ADR in cooee before it is queued.

## Later, not in blocks#2 (q2069)

| # | What | Needs first |
|---|---|---|
| **L1** a Rust desktop renderer (Linux, Windows, macOS; no HTML, no JS) | its own ADR picks egui, iced or Slint; it links the crate, so `patch`, `mirror` and `eval` are the crate's; it passes `renderers.md` section 7 with a harness of its own | B13 |
| **L2** a wasm build of the core | `patch`, `diff`, `mirror`, `eval` and `view` compiled to wasm; `stream.ts`, `patch.ts` and `behave.ts` become calls into it. The crate's bans already keep those modules free of the host | B11, a measured bundle size |
| **L3** a markdown reader for `prose` | `Prose::from_markdown`, Rust only: the tree is what travels, so no renderer changes | B8 |

Each is a cap raise of its own when it is queued.

## What each app holds at the end

| | drover | cooee |
|---|---|---|
| its data | the screen builders, the hub, the lane tails | the stores, the hub, core's screens |
| its kinds | `herd` | home, menu, persona, pairing and chat blocks |
| its layout | `layout.json` (tabs, cards, menu rows) | `layout.json` and its contract (`chat`, `sidebar`, `scanner`, `settings`, …) |
| its style layer | `drover.css` | its `BlockStyle`s |
| its islands | none yet | none yet |
| its transport | serve on tokio, SSE | cooee-server, SSE |
| from blocks | everything else | everything else |
