# ADR: blocks — one typed schema and three renderers that drover, cooee and websites build on (#2)

## Summary

Decision: one Rust crate is the source for blocks, ops, the stream, layout and theme; the schema, TS and Swift types
are generated. Three renderers draw them: live HTML, SwiftUI, and static HTML for websites, which the live one takes
over. Every block carries a fallback; apps add kinds, styles, local behaviours and islands; all of it runs headless.
Slices: 16 in blocks (blocks#4, #5, #6 kept; 13 to file), then 7 drover and 7 cooee issues; desktop and wasm later.
Open questions: the plan fills about 9,900 of the 10,000 lines, so what waits if it runs over; Playwright and esbuild
as dev tools; where cooee embeds the HTML renderer; drover's art onto swag's shared packs.

## Status

Revised 2026-11-18 after the owner's `revise` (q2068). The first version (`19c7345`) stands except where an amendment
changes it: q2058 (headless), q2060 (websites), q2061 (styling), q2063 (wire format), q2064 (compatibility), q2067
(behaviours, islands), q2069 (language-neutral, roadmap), q2070 (the cap). Parts 2 to 5, 7 and 10 to 16 carry them.
Behind the rest: q2047, q2048, q2049, q2051, q2053, q2056. Read `usage.md` first.

## Question

drover and cooee draw the same JSON blocks from two code bases that have drifted. What is the shape of the one repo
both depend on, so that a block, an op, a layout rule or a scheme is defined once, every renderer is held to it by
the compiler and by headless tests, an app can add blocks, styles and behaviour of its own, a website can be built
from the same blocks, and an older app keeps working against a newer server?

## What has drifted

| What | drover | cooee |
|---|---|---|
| block kinds drawn | 15 on the page, plus its own `scene`; nothing for `diagram`, which its server sends, nor for `config`, `secret`, `web`, `diff`, `editor` | the schema's 21; nothing for `composer`, which drover sends |
| `scene` | `{ weather, repos }` (the Herd) | `{ label, lanes }`, in the schema: one name, two shapes |
| ops read | `merge`, `replace`, `remove`, `insert` with `before`, `screen`, `badge` | the same, plus `dot` and `insert` with `after` |
| a kind it does not know | draws its children | draws nothing |
| schemes | 10 files | 12 files; the 10 shared have the same tokens (`paper` too), 8 of their labels differ |
| the scheme gate | TS, in the page | Rust, in the server; a third copy in swag |
| theme packs | swag `legacy-board/` at `68c01f0` | swag `packs/` at `26b0b2c`: another `theme.json` contract |
| layout | a places list inlined in the page | `layout.json`, its rules written twice (Swift and Rust) |
| the schema | none; blocks are `json!` in the builders | hand-written, 40 definitions |
| headless | `webview.mjs` on Playwright's WebKit: PNG and numbers | `ImageRenderer` frames: PNG only |

blocks#1's crate is a placeholder: two block kinds, tagged another way than either app's wire. Its gates are what
this ADR keeps; its types are replaced by the first slice.

## Options

**A. One repo: the crate, the generated types, the renderers, the layout and the theme; apps register their own
kinds (chosen).** A change to a block is one PR here that cannot merge until every renderer builds.

**B. Only the schema and the types here; each app keeps its renderer.** Rejected: the drift is in the renderers
(`diagram`, `composer`, `dot`), and q2047 and q2053 put them here.

**C. Three repos: types, web, Swift.** Rejected: a new kind would be three PRs and an app would hold three pins that
can disagree.

**D. HTML from the server instead of JSON blocks.** Rejected in screen-hub's ADR already: cooee draws natively. The
static renderer of part 11 is not this: it writes the first paint of a page from the same blocks.

**E. Adopt DivKit, Adaptive Cards, LiveView or Hyperview.** Not evaluated: q2065, build blocks as decided.

## Decision

Option A, in sixteen parts. `shapes.md` has the data, `renderers.md` what every renderer must do.

1. **One crate, layered.** `blocks` holds the modules `expr`, `kind`, `built`, `wire`, `diff`, `patch`, `shelf`,
   `mirror` (drover #1318's shapes), `behave`, `tree`, `site`, `layout`, `theme`, `web` and `codegen`. Their order is
   `.drover/arch.toml` layers, not separate crates: one dependency line and one version in an app. An app links serde
   and serde_json through it and nothing else.

2. **One superset schema.** The 21 kinds of cooee's schema, drover's `composer`, the four content kinds (`prose`,
   `hero`, `media`, `nav`) and `island`: 27. Every field either app sends, every op either app reads (`dot`, `insert`
   with `after`, #1318's `move`). The wire stays as both apps send it: an object with a `type`. Two corrections:
   `scene` is the schema's lane scene and drover's Herd block becomes its own kind `herd`; `header-strip`,
   `chat-cards` and `menu-row` are places in the layout, not blocks.

3. **An app's own kinds are registered by name.** Any `type` that is not a core kind is an app kind. The app names
   its kinds in its server's fault check, its page's `mount` and its Swift `appBlocks`. A core kind's name there is
   refused (a test fault, a compile error, a throw). An app kind must be built with a fallback (part 4), because the
   other app, the static site and an older build have no view for it.

4. **Compatibility: fallback, resync, two versions (q2064).**
   - Every block carries `fallback`: a title, an optional subtitle and tap. The crate writes it from the block's own
     fields; an app kind and an island are given one by their constructor. `row` and `text` are the two forms a
     fallback is drawn as, so they carry none. A client that has no view for a `type` draws its fallback, then its
     children. Nothing is skipped.
   - An op a client does not know makes it drop the frame and ask for the whole screen.
   - `SCHEMA_VERSION` changes only with a breaking change. Each side speaks its own version and the one before; the
     stream runs at the lower of the two. More than one apart, the client keeps its last copy and says which side to
     update. A new kind, field, op or enum value needs no version change.
   - CI runs the last released renderers, HTML and SwiftUI, headless against today's screens (part 16).

5. **Codegen: Rust → schema → TS and Swift, one command.** `just gen` writes the kind lists from their folders, the
   schema from the Rust types, `types.ts` and `Blocks.swift` from the schema, the fixtures from each kind's typed
   sample, the expected trees and static HTML of those fixtures, the hook names, the schemes and the HTML bundle.
   CI's arch-check fails a PR where any is stale. Every renderer switches over the generated `Kind` exhaustively, so
   a core kind without a view does not build: it is written as a view or as `gap(<issue>)`, which draws the fallback.

6. **Layout: cooee's `layout.json`, with the app's part as a contract.** The types, the rules (`check`), the merge
   of a plugin's places and the per-size resolve move here. This repo knows one component, `nav`; an app declares
   the rest and its locked screens in a `Contract`, and draws them. drover's places list becomes its `layout.json`.

7. **Theme: rules here, looks in swag.** `Scheme` (19 colours) and `Style` (type, spacing, radius, motion,
   surface) are the tokens an app sets. The contrast gate is Rust only: a server serves only what passed. blocks
   holds the rules (the token shapes, the gate, the pack format and `check_pack`, `css`) and one neutral default
   pair of its own (q2118, q2119); every named scheme and every pack lives in swag's crate, and an app pins both
   (q2115). `check_pack` takes the schemes a pack may name. A renderer reads art through a `Theme` port, so
   drover's page can keep its `legacy-board/` art until the owner moves it.

8. **The live renderers move as they are, then get typed.** HTML: drover's `blocks.ts` becomes `render/<kind>.ts`,
   the generic parts of `main.ts` become `shell.ts`, `ops.ts` goes (#1318's patcher replaces it). SwiftUI: cooee's
   `JSONValue` and `LiveScreen` become `Blocks`; its generic `Block*.swift`, `SlotView`, `Look` and `Palette` become
   `BlocksUI`. A move changes no drawing code; the app's goldens and frames prove it. Typed reads come last.

9. **Consumption: one commit per app, in every manifest.** Cargo `rev`, npm `#sha`, SwiftPM `revision`, and a test
   in the app that they agree. drover bundles the TS source with its own esbuild. cooee has no Node, so this repo
   commits the built bundle and the crate exposes it as two strings.

10. **Wire format (q2063).** The typed Rust values are the source and JSON is the default. A media type names the
    format and the version, `application/vnd.blocks+json;v=1`, and the crate's `Format` reads and writes through it,
    so CBOR or MessagePack is one more variant and no schema change. No JSON is written by hand: servers build
    blocks, ops and actions through the typed API, fixtures are generated from typed samples, and `json!` is banned
    here and, by D4 and C1, in both apps' builders. Owner-edited files (`layout.json`, a scheme) stay files.

11. **Websites: a static renderer in Rust (q2060).** `site::page` turns a built screen into a whole HTML document
    that works with no JS: a tap is an `<a href>`, an action is a `<form method="post">`, the theme is CSS variables
    in the head, and the head carries the title, description and link-preview tags. Four content kinds: `prose` (a
    typed tree, not a markdown string), `hero`, `media`, `nav`. The static markup is the live renderer's markup,
    held equal per kind by a generated fixture, so `mount` adopts the page without redrawing it: no flash. drover's
    `no Rust HTML` rule (#269) is about drover's page shell and does not apply here.

12. **Styling: tokens, then hooks (q2061).** An app sets tokens, and may add its own CSS and SwiftUI modifiers per
    kind. Web: every block root has `class="b b-<kind>"`, `data-block`, `data-id`, `data-variant` and `data-tone`,
    and each styleable part `b-<kind>__<part>`; the core CSS sits in `@layer blocks`, so an app's rule wins without
    `!important`. SwiftUI: `.blockStyle(kind)` takes a `BlockStyle`, which wraps a block's drawn content. Neither
    can replace a core view. The names are generated from the kind files, so both HTML writers use the same ones.

13. **Behaviours: a typed expression tree (q2067, q2069).** A screen declares local state; a block may have `show`,
    a field `checks`, a control `enabled`, a tap `set`, a value `get`. Each is an `Expr`: 13 operations, total, with
    no string grammar and so no parser in any renderer, and never a JS snippet. Rust, TS and Swift each evaluate it
    in about 100 lines, held equal by `fixtures/behave/`. An expression a client cannot evaluate counts as absent,
    and the server still validates every action.

14. **Islands (q2067).** `island` hosts a full client component: a custom element on the web, a registered view in
    SwiftUI. The contract is `props` in (a `merge` updates them, the instance lives on), named `events` out (sent as
    actions) and a required fallback, which is what the static site, an older app and a renderer without the
    component draw. blocks never loads code: the component ships in the app's own bundle or binary.

15. **Headless (q2058).** Each renderer has a harness with one contract: a screen in; a PNG, the drawn tree as JSON
    and timings out; scripted taps, typing, scrolling and stream frames in between. HTML: `blocks-shot`, on
    Playwright's WebKit. SwiftUI: the `BlocksSnapshot` target and `blocks-snap`. The crate computes the tree every
    renderer must draw (`tree::expect`), so a harness can fail a run by itself. Verify lanes and perf gates call it.

16. **A language-neutral contract (q2069).** What a renderer must do is `renderers.md` plus fixtures, not TS or
    Swift code: the schema, the op fixtures, the behaviour vectors and the expected trees. A renderer conforms when
    its harness passes them. A Rust desktop renderer and a wasm build of the core are later issues (`migration.md`).

## Fit with blocks#1's gates

| Gate | How the new code is held to it |
|---|---|
| clippy deny list, `unsafe` forbidden | unchanged; the crate stays one package under `[workspace.lints]` |
| `web/lint.mjs` and its fixtures | unchanged; `eval` and `new Function` stay banned, which is why behaviours are data |
| comment policy `strict` | unchanged; the moved Swift loses its doc blocks beyond one line |
| deps gate, `cargo deny` | no new crate. Dev tools only: esbuild and Playwright (open question 2) |
| perf budgets (`tests/perf.rs`) | the numbers stay: diff and apply a 200-row screen in 150 µs each, a 500 KB screen serialized in 3 ms and parsed in 5 ms, now with fallbacks written. New: `site::page` of the 500 KB screen, `behave::view` of a 200-row screen, `layout::check`, `gate`; in WebKit, first paint of the 200-row screen under 300 ms warm (drover #337's number) |
| soak | `Shelf`: memory flat over 200,000 frames and 400 reconnects |
| sim (`just sim`, nightly) | `apply(a, ops(a, b)) == b` on random screens; `Shelf` with `Mirror` under dropped, doubled and reordered frames; random expressions never panic |
| arch-check | the layers in `boundaries.md`, the bans and the generated list below |
| line cap (blocks#7) | 10,000 non-test, non-generated lines; `migration.md` budgets each slice |
| Swift | `swift test` on macOS from the root manifest; Swift 6 mode, warnings as errors |

## Fit with drover #1318

Its B1 and B2 are this plan's first two issues, with their shapes as written there: `Built`, `Fault`, `Op` with
`move`, `Frame`, `Hello`, `Sync`, `Shelf`, `Mirror`, `wire::old`, `stream.ts`, `patch.ts`. This ADR adds to them and
changes four lines: `Built::check` takes the app's kinds; `Op` gains `after` on `insert` and `Unknown`; the three
places leave `Block`; the client names its version when it opens the stream. Its folder `ts/` is `web/` here.
drover's slices 1 to 7 of #1318 need nothing else from this plan and stay first in drover's order.

## Smaller choices

- **A tree, not a string, for expressions.** A grammar would need a parser in every renderer and each would differ at
  the edges. A tree is built by the typed API, travels like any block and is evaluated by one recursive function.
- **Named patterns, not regexes.** `email`, `url`, `number`, `filled`: JS, Swift and Rust regexes differ.
- **`prose` is a tree.** `text` keeps its `markdown` string, which both apps send; a new kind does not add a third
  markdown reader. A markdown reader for authors is Rust only and a later issue.
- **A fallback on the wire for every block but `row` and `text`.** A floor of kinds that need none would save bytes
  and would need per-version bookkeeping. A 200-row screen is rows, so the cost is small; perf.rs holds it.
- **Two HTML writers and a fixture between them**, not one template language read by both. The fixture is generated
  from Rust and compared in the browser test: a difference fails CI with the kind's name.
- **Scripted input is by block id.** In WebKit a step is a real event on the element; in SwiftUI it calls the
  handler the block registered. The steps and the tree are the same shape in both.
- **A commit, not a tag, in every manifest.** Tags mark releases; the compat job reads them, no manifest does.
- **The gate only in Rust; the schemes and packs in swag, not copied here (q2115); two layout readers (Rust and
  Swift).**

## Consequences

- A new core kind is one PR with five new files and no edited list (`usage.md`); two such PRs do not conflict.
- A wire change is a PR here, then a pin PR in each app. That is the price of one definition.
- drover's page takes the renderer and the shell from the package: about 1,200 lines of `web/src` go.
- cooee loses about 3,600 lines of Swift and about 900 of Rust; its hand-written schema becomes the generated one.
- This repo reaches about 3,800 lines of Rust, 2,100 of TS and 4,000 of Swift: 9,900 of the cap's 10,000. The
  estimate is good to one part in ten, so the cap will bind (open question 1).
- A block's title travels twice where it has a fallback. Screens grow by a few percent; rows do not.
- A breaking change costs a down-converter (`wire::prev`) that lives for one version.
- The static and the live HTML can never differ silently, at the price of writing each kind's markup twice.
- An island is as trusted as the app that ships it: blocks gives it props and takes named events, nothing more.
- `BlocksUI` needs iOS 26, macOS 26 and Swift tools 6.2, as cooee's package does; blocks#1's manifest says 5.9.
- cooee's trust rule moves with the card view: the poster comes from the caller, never from JSON.
- The 8 scheme labels that differ are settled in blocks#6's ask; recommended: cooee's shorter text. No colour changes.
- Not decided here, on purpose: any new app block, what a screen shows, cooee's own stream routes, which website is
  built first (the static renderer is gated on a fixture site until one exists).

## Open questions

1. **The cap.** The budget (`migration.md`) puts every amendment and `diagram` on the web at 9,900 lines, inside
   the cap's 500-line warning band. The HTML views for `scene`, `secret`, `config`, `web`, `diff` and `editor`,
   about 250 lines, do not fit. Recommended: build in the listed order and let those six keep drawing their
   fallback on the web, where no page shows them today. No raise is asked now; if the estimate runs over, a lane
   trims first and asks only when its own PR would cross the cap. The other choice is a raise to 10,500 at B14.
2. **Dev tools.** esbuild builds the bundle cooee embeds; Playwright's WebKit runs the HTML harness. Recommended:
   both as dev dependencies at drover's pinned versions (0.28.2, 1.63.0). Nothing an app links.
3. **Where does cooee embed the HTML renderer (q2047)?** The bundle is built either way (B6). Recommended: file C6
   when the owner names the surface; nothing else waits for it.
4. **drover's art.** drover's page draws swag's `legacy-board/` packs; the shared `Theme` reads `packs/`.
   Recommended: drover keeps its art through the port now; moving is its last issue (D6), with a design stage.

## `.drover/arch.toml` lines

The central lists are folders from the first slice, so no list is ever hand-merged. Each slice adds its lines in
the PR that creates the files.

B1, replacing blocks#1's `screen`, `ops` and `stream` layers (the `Block` enum in `screen.rs` is the old list; it is
deleted, and `kind/mod.rs` is generated from the folder):

```toml
generated = [
    "crates/blocks/src/kind/mod.rs", "schema/blocks.schema.json",
    "web/src/gen/types.ts", "web/src/gen/hooks.ts", "swift/Sources/Blocks/Gen/Blocks.swift",
    "fixtures/blocks/*.json",
]                                                     # `generate = "just gen"` stays; sample.json and sample.ts go

[[collect]]
dir = "crates/blocks/src/kind"
glob = "*.rs"

[[collect]]
dir = "fixtures/behave"
glob = "*.json"

[[ban]]
pattern = "cooee"
paths = ["Cargo.toml", "crates/*/Cargo.toml", "crates/*/src/**", "web/src/**", "web/shot/**", "swift/Sources/**"]
reason = "cooee depends on blocks, never the other way: no cooee import, type or name here"
comments = true
ignore_case = true

[[ban]]
pattern = "json!"
paths = ["crates/*/src/**"]
reason = "q2063: no hand-written JSON; build the typed value and serialize it"
```

The layers, one `[[layer]]` each, as `boundaries.md` draws them: `expr`; `kind` (may use `expr`); `built` (`kind`);
`wire` (`kind`); `diff` and `patch` (`kind`, `built`, `wire`); `shelf` (`built`, `wire`, `diff`); `mirror` (`built`,
`wire`, `patch`); `codegen` (all). Later slices add `behave` (`expr`, `kind`, `built`), `tree` (those and `behave`,
`wire`), `site` (`kind`, `built`, `behave`, `theme`), and `layout`, `theme` and `web` with no `may_use`.

The later slices add their generated files and folders:

```toml
generated = [
    "web/src/gen/schemes.ts", "swift/Sources/Blocks/Gen/Schemes.swift",           # B4
    "web/src/render/index.ts",                                                    # B5
    "web/dist/blocks.js", "web/dist/blocks.css",                                  # B6
    "fixtures/trees/*.json",                                                      # B7
    "crates/blocks/src/site/mod.rs", "fixtures/html/*.html",                      # B8
    "swift/Sources/BlocksUI/Kinds.swift",                                         # B9
]

[[collect]]
dir = "web/src/render"
glob = "*.ts"

[[collect]]
dir = "crates/blocks/src/site"
glob = "*.rs"

[[collect]]
dir = "swift/Sources/BlocksUI/Kinds"
glob = "*.swift"

[[ban]]
pattern = "fetch("
paths = ["web/src/render/**", "web/src/patch.ts", "web/src/behave.ts", "web/src/island.ts"]
reason = "a renderer draws one block from what it is handed; the shell and the stream do the network"

[[ban]]
pattern = "new EventSource"
paths = ["web/src/**"]
except = ["web/src/stream.ts"]
reason = "one stream per device, opened by stream.ts"

[[ban]]
pattern = "createElement('script')"
paths = ["web/src/**"]
reason = "blocks never loads code: an island's component ships in the app's own bundle"

[[ban]]
pattern = "playwright"
paths = ["web/src/**"]
reason = "the browser driver is the harness's (web/shot), never in the bundle"

[[ban]]
pattern = "import SwiftUI"
paths = ["swift/Sources/Blocks/**"]
reason = "Blocks is the model: Foundation only; views live in BlocksUI"

[[ban]]
pattern = "ComposableArchitecture"
paths = ["Package.swift", "swift/**"]
reason = "the views take closures (act, open); an app's store stays in the app"
```

If arch-check's `generated` takes no glob, the lane lists the files one by one; the folders stay `[[collect]]`.

Docs and CI are one file per area: `docs/{schema,layout,theme,html,swift,site,behave,islands,headless,consume}.md`;
B2 moves the `web` job out of `ci.yml` into `.github/workflows/web.yml`, beside `swift.yml` and `sim.yml`, and B13
adds `compat.yml`.

In drover and cooee the old lists are deleted by the issues in `migration.md`, not frozen: drover's `R` map in
`web/src/blocks.ts` (D2) and cooee's `BlockNode` switch in `Blocks.swift` (C4). D4 and C1 add the `json!` ban to
their builders' paths.
