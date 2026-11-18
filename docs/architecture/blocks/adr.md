# ADR: blocks — one typed schema, one layout model, one theme and two renderers that drover and cooee both pin (#2)

## Summary

Decision: one Rust crate holds the typed blocks, ops, stream protocol, layout and theme; the JSON Schema, TS and
Swift types are generated from it. One HTML renderer and one SwiftUI package draw every block. An app adds its own
block kinds by name and keeps only its data, those kinds and its layout.json. An older app skips a newer block.
Slices: 10 in blocks (the crate, codegen, layout, theme, HTML renderer, HTML shell, SwiftUI, the parity gaps), then
6 drover and 6 cooee issues that each delete a copy, each blocked on the blocks issue it needs (see migration.md).
Open questions: where cooee embeds the HTML renderer; drover's art onto swag's shared packs; esbuild as a build tool.

## Status

Proposed 2026-11-18, for the owner. Behind it: q2047 (one HTML renderer cooee can embed), q2048 and q2051 (this
public MIT repo), q2049 (drover depends on it from day one), q2053 (schema, generated types, HTML renderer, SwiftUI
package, theme), q2056 (a layout module drives both shells). Read `usage.md` first.

## Question

drover and cooee draw the same JSON blocks from two code bases that have drifted. What is the shape of the one repo
both depend on, so that a block, an op, a layout rule or a scheme is defined once, both renderers are held to it by
the compiler, an app can still add blocks of its own, and an older app keeps working against a newer server?

## What has drifted

Read at the commits `README.md` names.

| What | drover | cooee |
|---|---|---|
| block kinds drawn | 15 on the page, plus its own `scene`; nothing for `diagram`, which its server sends, nor for `config`, `secret`, `web`, `diff`, `editor` | the schema's 21; nothing for `composer`, which drover sends |
| `scene` | `{ weather, repos }` (the Herd) | `{ label, lanes }`, in the schema: one name, two shapes |
| ops read | `merge`, `replace`, `remove`, `insert` with `before`, `screen`, `badge` | the same, plus `dot` and `insert` with `after` |
| a kind it does not know | draws its children | draws nothing |
| schemes | 10 files | 12 files; the 10 shared have the same tokens, 8 of their labels differ |
| the scheme gate | TS, in the page | Rust, in the server; a third copy in swag |
| theme packs | swag `legacy-board/` at `68c01f0` | swag `packs/` at `26b0b2c`: another `theme.json` contract |
| layout | a places list inlined in the page | `layout.json`, its rules written twice (Swift and Rust) |
| the schema | none; blocks are `json!` in the builders | hand-written, 40 definitions |

blocks#1's crate (`issue-1`) is a placeholder: two block kinds, tagged another way than either app's wire. Its gates
are what this ADR keeps; its types are replaced by the first slice.

## Options

**A. One repo: the crate, the generated types, both renderers, the layout and the theme; apps register their own
kinds (chosen).** A change to a block is one PR here that cannot merge until both renderers build.

**B. Only the schema and the types here; each app keeps its renderer.** Rejected: the drift is in the renderers
(`diagram`, `composer`, `dot`), and q2047 and q2053 put them here.

**C. Three repos: types, web, Swift.** Rejected: a new kind would be three PRs and an app would hold three pins that
can disagree.

**D. HTML from the server instead of JSON blocks.** Rejected in screen-hub's ADR already: cooee draws natively.

## Decision

Option A, in nine parts. `shapes.md` has the types.

1. **One crate, layered.** `blocks` holds eleven modules: `kind`, `built`, `wire`, `diff`, `patch`, `shelf`, `mirror`
   (drover #1318's shapes), `layout`, `theme`, `web` and `codegen`. Their order is `.drover/arch.toml` layers, not
   separate crates: one dependency line and one version in an app, and the same guarantee. An app links serde and
   serde_json through it and nothing else.

2. **One superset schema.** The 21 kinds of cooee's schema plus drover's `composer`, every field either app sends,
   and every op either app reads (`dot`, `insert` with `after`, and #1318's `move`). The wire stays as both apps
   send it: an object with a `type`. Two corrections: `scene` is the schema's lane scene, and drover's Herd block
   becomes its own kind `herd`; `header-strip`, `chat-cards` and `menu-row` are places in the layout, not blocks.

3. **An app's own kinds are registered by name.** Any `type` that is not a core kind is an app kind. The app says
   which ones it has in three places: its server's fault check, its page's `mount`, its Swift `appBlocks`. A core
   kind's name there is refused (a test fault, a compile error, a throw), so nobody overrides a core renderer and a
   later core kind cannot silently collide. Today's app kinds: cooee's home (`pinned`, `chats`), menu, persona and
   pairing blocks; drover's `herd`. Their views and their names stay in the apps.

4. **Versioning: additive is free, breaking bumps the major.** A client draws an unknown kind's children, else
   nothing; ignores an unknown field; and on an unknown op drops the frame and asks for the whole screen. So a new
   kind, field or op needs no version change and never breaks an older app. Removing or renaming does: it bumps
   `SCHEMA_VERSION`, which `hello` carries, and an older client then keeps its last copy and says `update the app`.

5. **Codegen: Rust → schema → TS and Swift, one command.** `just gen` writes the kind lists from their folders,
   then the schema from the Rust types, then `types.ts` and `Blocks.swift` from the schema, the built-in schemes for
   both, and the HTML bundle. CI's arch-check fails a PR where any of them is stale. Both renderers switch over the
   generated `Kind` exhaustively, so a core kind without an HTML or a SwiftUI view does not build. That is the
   parity gate: drover's page drawing nothing for `diagram` becomes a compile error or a `gap(<issue>)` line.

6. **Layout: cooee's `layout.json`, with the app's part as a contract.** The types, the rules (`check`), the merge
   of a plugin's places and the per-size resolve move here. This repo knows one component, `nav`; an app declares
   the rest (cooee: `chat`, `sidebar`, `scanner`, `settings` and more) and its locked screens in a `Contract`, and
   draws them. Both shells walk the resolved tree. drover's places list becomes its `layout.json`.

7. **Theme: one scheme shape, one gate, one set of built-ins, one swag pin.** `Scheme` with its 19 tokens, the
   contrast gate (Rust only: a server serves only what passed), cooee's `Style` and pack `theme.json`, the 12
   schemes as one file each, and swag's `packs/` vendored at one commit. A renderer reads art through a `Theme`
   port (`figure`, `word`), so drover's page can keep its `legacy-board/` art until the owner moves it.

8. **The renderers move as they are, then get typed.** HTML: drover's `blocks.ts` becomes `render/<kind>.ts`, the
   generic parts of `main.ts` become `shell.ts`, `ops.ts` goes (#1318's patcher replaces it). SwiftUI: cooee's
   `JSONValue`, `LiveScreen`, `Layout` and `Style` become `Blocks`; its generic `Block*.swift`, `SlotView`, `Look`
   and `Palette` become `BlocksUI`. A move changes no drawing code, and the app's goldens and snapshot frames prove
   it. The views keep reading fields by key at first; typed reads come last, as refactors.

9. **Consumption: one commit per app, in every manifest.** Cargo `rev`, npm `#sha`, SwiftPM `revision`, and a test
   in the app that they agree. drover bundles the TS source with its own esbuild, as #1318 decided. cooee has no
   Node, so this repo also commits the built bundle and the crate exposes it as two strings.

## Fit with blocks#1's gates

| Gate | How the new code is held to it |
|---|---|
| clippy deny list, `unsafe` forbidden | unchanged; the crate stays one package under `[workspace.lints]` |
| `web/lint.mjs` and its fixtures | drover's page passes the same 14 rules today, so its code moves without edits for lint |
| comment policy `strict` | unchanged; the moved Swift loses its doc blocks beyond one line |
| deps gate, `cargo deny` | no new crate. Build tools only: esbuild (open question 3) |
| perf budgets (`tests/perf.rs`) | the numbers stay: diff and apply a 200-row screen in 150 µs each, a 500 KB screen serialized in 3 ms and parsed in 5 ms. B1 points them at the real types. If the diff by id cannot meet 150 µs, B1 reports it; it does not raise the number. New budgets: `check` of a 500 KB screen, `layout::check` of a 64 KiB file, `gate` of a scheme |
| soak | `Shelf`: memory flat over 200,000 frames and 400 reconnects |
| sim (`just sim`, nightly) | `apply(a, ops(a, b)) == b` on random screens, and `Shelf` with `Mirror` converging under dropped, doubled and reordered frames |
| arch-check | the layers in `boundaries.md`, the bans below, the generated list below |
| Swift | `swift test` on macOS, now from the root manifest; Swift 6 mode, complete concurrency, warnings as errors |

## Fit with drover #1318

Its B1 and B2 are this plan's first two issues, with their scope and shapes as written there: `Built`, `Fault`,
`Op` with `move`, `Frame`, `Hello`, `Sync`, `Shelf`, `Mirror`, `wire::old`, `stream.ts`, `patch.ts`. This ADR adds
to them, and changes three lines: `Built::check` takes the app's kinds; `Op` gains `after` on `insert` and the
`Unknown` variant; the three places leave `Block`. Its folder `ts/` is `web/` here, as blocks#1 named it. drover's
slices 1 to 7 of #1318 need nothing else from this plan and stay first in drover's order.

## Smaller choices

- **A `Kind` switch, not typed views, at the move.** Exhaustiveness gives the parity gate at once; typing 3,600
  lines of views in the same PR would hide a pixel change in a rewrite.
- **A commit, not a tag, in every manifest.** A tag would be a second name for the commit that can disagree with
  the Cargo `rev`. Tags mark promotes to `main` and nothing reads them.
- **The gate only in Rust.** drover gates schemes in the browser today; its server gates them on load instead, as
  cooee's does, and a page then gets only schemes that passed.
- **The packs are vendored, not fetched by a build script.** The crate stays pure, and an app builds offline.
- **Two layout readers, Rust and Swift.** cooee's app must hold its locked screens whatever a server says. Shared
  fixtures keep the two in step, as cooee's style fixtures do today.
- **The unknown-kind rule is drover's** (draw the children). cooee draws nothing today; nothing it receives changes.

## Consequences

- A new core kind is one PR with four new files and no edited list (`usage.md`); two such PRs do not conflict.
- A wire change is a PR here, then a pin PR in each app. That is the price of one definition.
- drover's page takes the renderer and the shell from the package: about 1,200 lines of `web/src` go, and `main.ts`
  becomes one `mount` call plus pairing, alerts and timings.
- cooee loses about 3,600 lines of Swift and about 900 of Rust (layout rules, the scheme gate, the swag pin); its
  hand-written schema file becomes the generated one, and `cooee plugin check` reads it from the crate.
- This repo grows to about 2,300 lines of Rust, 1,900 of TS and 3,600 of Swift. blocks#1's line cap needs that room.
- `BlocksUI` needs iOS 26 and macOS 26 and Swift tools 6.2, as cooee's package does; blocks#1's manifest says 5.9.
- cooee's trust rule moves with the card view: the poster comes from the caller, never from JSON, and a `secret`,
  `run`, `confirm` or `permissions` card without one draws `source unknown`. cooee's snapshot of that line is the gate.
- The 8 scheme labels that differ take cooee's shorter text. No colour changes in either app.
- Until its last issue drover holds two theme contracts: the shared schemes and gate from here, its own
  `legacy-board/` art through the `Theme` port.
- The job that runs arch-check needs cargo and Node once the bundle is generated.
- Not decided here, on purpose: any new block, any change to what a screen shows, cooee's own stream routes.

## Open questions

1. **Where does cooee embed the HTML renderer (q2047)?** The bundle and `blocks::web` are built either way (B6).
   The cooee issue that uses them (C6) needs the surface named: its web page, or a web view in the app for kinds
   SwiftUI does not draw. Recommended: file C6 when the owner names it; nothing else waits for it.
2. **drover's art.** The shared renderer's own `Theme` reads swag's `packs/` (cooee's contract). drover's page draws
   `legacy-board/` packs, with more art (the Herd, load scenes, moments). Recommended: drover keeps its art through
   the port now; moving its page to `packs/` is its last issue (D6), with a design stage, because the look changes.
3. **esbuild in this repo.** cooee has no Node, so the bundle must be built here and committed. Recommended: esbuild
   at drover's pinned version, as a dev dependency only; nothing an app links.

## `.drover/arch.toml` lines

The central lists are folders from the first slice, so no list is ever hand-merged. Each slice adds its lines in
the PR that creates the files.

B1, replacing blocks#1's `screen`, `ops` and `stream` layers (the `Block` enum in `screen.rs` is the old list; it is
deleted, and `kind/mod.rs` is generated from the folder):

```toml
generated = ["crates/blocks/src/kind/mod.rs"]        # added to the list; `generate = "just gen"` stays

[[collect]]
dir = "crates/blocks/src/kind"
glob = "*.rs"

[[collect]]
dir = "fixtures/blocks"
glob = "*.json"

[[ban]]
pattern = "cooee"
paths = ["Cargo.toml", "crates/*/Cargo.toml", "crates/*/src/**", "web/src/**", "swift/Sources/**"]
reason = "cooee depends on blocks, never the other way: no cooee import, type or name here"
comments = true
ignore_case = true
```

The layers, one `[[layer]]` each, as `boundaries.md` draws them: `kind`; `built` (may use `kind`); `wire` (`kind`);
`diff` and `patch` (`kind`, `built`, `wire`); `shelf` (`built`, `wire`, `diff`); `mirror` (`built`, `wire`,
`patch`); `codegen` (all). B3 adds `layout`, B4 `theme`, B6 `web`, each with no `may_use`.

B2, B4, B5, B6 and B8 add their generated files and folders:

```toml
generated = [
    "schema/blocks.schema.json", "schema/sample.json", "web/src/sample.ts",
    "web/src/gen/types.ts", "swift/Sources/Blocks/Gen/Blocks.swift",              # B2
    "web/src/gen/schemes.ts", "swift/Sources/Blocks/Gen/Schemes.swift",           # B4
    "web/src/render/index.ts",                                                    # B5
    "web/dist/blocks.js", "web/dist/blocks.css",                                  # B6
    "swift/Sources/BlocksUI/Kinds.swift",                                         # B8
]

[[collect]]
dir = "theme/schemes"
glob = "*.json"

[[collect]]
dir = "web/src/render"
glob = "*.ts"

[[collect]]
dir = "swift/Sources/BlocksUI/Kinds"
glob = "*.swift"

[[ban]]
pattern = "fetch("
paths = ["web/src/render/**", "web/src/patch.ts"]
reason = "a renderer draws one block from what it is handed; the shell and the stream do the network"

[[ban]]
pattern = "new EventSource"
paths = ["web/src/**"]
except = ["web/src/stream.ts"]
reason = "one stream per device, opened by stream.ts"

[[ban]]
pattern = "import SwiftUI"
paths = ["swift/Sources/Blocks/**"]
reason = "Blocks is the model: Foundation only; views live in BlocksUI"

[[ban]]
pattern = "ComposableArchitecture"
paths = ["Package.swift", "swift/**"]
reason = "the views take closures (act, open); an app's store stays in the app"
```

Docs and CI are one file per area: `docs/{schema,layout,theme,html,swift,consume}.md`, and B2 moves the `web` job
out of `ci.yml` into `.github/workflows/web.yml`, beside `swift.yml` and `sim.yml`.

In drover and cooee the old lists are deleted by the issues in `migration.md`, not frozen: drover's `R` map in
`web/src/blocks.ts` (D2) and cooee's `BlockNode` switch in `Blocks.swift` (C4). cooee's C1 adds
`docs/plugins/screens.schema.json` to its `generated` list until the file goes.
