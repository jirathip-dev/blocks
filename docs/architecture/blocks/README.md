# blocks: one typed schema and three renderers that drover, cooee and websites build on (#2)

## Summary

Decision: one Rust crate is the source for blocks, ops, the stream, layout and theme; the schema, TS and Swift types
are generated. Three renderers draw them: live HTML, SwiftUI, and static HTML for websites, which the live one takes
over. Every block carries a fallback; apps add kinds, styles, local behaviours and islands; all of it runs headless.
Slices: 16 in blocks (blocks#4, #5, #6 kept; 13 to file), then 7 drover and 7 cooee issues; desktop and wasm later.
The slices split out after the ADR (B1b, B4b, B9b, B16b) and every slice's issue number are in `migration.md`.
Open questions: the plan fills about 9,900 of the 10,000 lines, so what waits if it runs over; Playwright and esbuild
as dev tools; where cooee embeds the HTML renderer; drover's art onto swag's shared packs.

## Read in this order

| File | What |
|---|---|
| `usage.md` | how the callers read: the pin, a server, local behaviour, an island, a website, a page, the Swift app, a headless run, an app's own block |
| `adr.md` | the question, what drifted, the options, the decision in sixteen parts, the fit with blocks#1 and drover #1318, consequences, open questions, the `.drover/arch.toml` lines |
| `shapes.md` | the repo's layout and the data shapes: block, fallback, behaviours, op, wire and format, layout, theme, what is generated, the versioning table |
| `renderers.md` | what every renderer must do, in no language: the draw rule, style hooks, behaviours, islands, the static page, headless, conformance; four statecharts |
| `boundaries.md` | which module may call which in each language, how each rule is enforced, and three statecharts |
| `migration.md` | the issues for blocks, drover and cooee, in order, mapped onto the existing ones, with the line budget and the later issues |

## Where each amendment is answered

| Amendment | ADR part | Detail |
|---|---|---|
| q2058 headless | 15 | `renderers.md` 6; slices B7, B10; D7, C7 |
| q2060 websites | 11 | `renderers.md` 5; `shapes.md` content kinds; slice B8 |
| q2061 styling | 7, 12 | `renderers.md` 2; slices B4, B5, B9 |
| q2063 wire format | 10 | `shapes.md` Wire; slices B1, B2; D4, C1 |
| q2064 compatibility | 4 | `shapes.md` Versioning; `renderers.md` 1; slice B13 |
| q2067 behaviours, islands | 3, 13, 14 | `shapes.md` Behaviours; `renderers.md` 3, 4; slices B11, B12 |
| q2069 language-neutral, roadmap | 13, 16 | `renderers.md` 7; `migration.md` L1, L2 |
| q2068 (8) blocks#4, #5, #6; q2070 the cap | | `migration.md`: the existing issues, the line budget |

## The repo in one picture

```
              crates/blocks (Rust: serde, serde_json)                    the one source
   expr  kind  built  wire  diff  patch  shelf  mirror  behave  tree  │  site  │  layout  │  theme  │  web
        │ just gen                                                       └─> static HTML: a page with no JS
        ├──> schema/blocks.schema.json, fixtures/{blocks,trees,html}
        ├──> web/src/gen/*.ts ──> web/src: stream, patch, render/<kind>, behave, island, shell ──> web/dist/blocks.{js,css}
        └──> swift/Sources/Blocks/Gen/*.swift ──> Blocks (Foundation) ──> BlocksUI (SwiftUI)

   headless:  web/shot (blocks-shot, WebKit)  ·  BlocksSnapshot (blocks-snap)      one contract: PNG, tree, steps
   drover:    Cargo rev + npm #sha            its data, its `herd` block, its layout.json, its CSS
   cooee:     Cargo rev + SwiftPM revision    its data, its persona, pairing, home and chat blocks, its layout.json, its styles
```

Nothing in this repo names drover or cooee: a ban in `.drover/arch.toml` fails CI on either word in the sources.

## What was read

- blocks `issue-1` at `b3d35f2` (blocks#1: the gates and a placeholder crate), and blocks#4, #5, #6 and #7 as filed.
- drover `origin/staging` at `dd475fcf0`: `web/src/`, `crates/server/src/screens.rs`, `assets/schemes`, the `ui-webkit`
  job and `crates/cli/tests/support/webview.mjs`.
- drover `issue-1318` at `f1664e9fc`: `docs/architecture/screen-hub/` (the row diff and the stream protocol).
- cooee `origin/staging` at `4e831d972`: `docs/plugins/screens.schema.json`, `docs/architecture/layout-blocks/` and
  `styles-as-packs/`, `apple/Sources/CooeeCore`, `apple/Sources/CooeeUI`, `apple/Tests/CooeeUITests` (the snapshot
  frames), `crates/cooee-server/src/layout.rs`; cooee#615, #620, #621, #622 and #624 as filed.
- "After Rune" in q2058 is read as its three abilities: a PNG, the drawn tree as JSON, scripted input. Nothing else
  of Rune's is assumed.
