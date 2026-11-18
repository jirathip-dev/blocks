# blocks: one typed schema, one layout model, one theme and two renderers that drover and cooee both pin (#2)

## Summary

Decision: one Rust crate holds the typed blocks, ops, stream protocol, layout and theme; the JSON Schema, TS and
Swift types are generated from it. One HTML renderer and one SwiftUI package draw every block. An app adds its own
block kinds by name and keeps only its data, those kinds and its layout.json. An older app skips a newer block.
Slices: 10 in blocks (the crate, codegen, layout, theme, HTML renderer, HTML shell, SwiftUI, the parity gaps), then
6 drover and 6 cooee issues that each delete a copy, each blocked on the blocks issue it needs (see migration.md).
Open questions: where cooee embeds the HTML renderer; drover's art onto swag's shared packs; esbuild as a build tool.

## Read in this order

| File | What |
|---|---|
| `usage.md` | how drover's and cooee's code reads once they use the repo: the pin, a server, a page, the Swift app, an app's own block |
| `adr.md` | the question, what drifted, the options, the decision in nine parts, the fit with blocks#1 and drover #1318, consequences, open questions, the `.drover/arch.toml` lines |
| `shapes.md` | the repo's layout and the data shapes: block, op, wire, layout, theme, what is generated, the versioning table |
| `boundaries.md` | which module may call which in each language, how each rule is enforced, and three statecharts |
| `migration.md` | the issues for blocks, drover and cooee, in order, with what each deletes and what blocks it |

## The repo in one picture

```
              crates/blocks (Rust: serde, serde_json)                    the one source
   kind  built  wire  diff  patch  shelf  mirror  │  layout  │  theme  │  web (the built bundle, as two strings)
        │ just gen
        ├──> schema/blocks.schema.json
        ├──> web/src/gen/*.ts ──> web/src: stream, patch, render/<kind>, theme, shell ──> web/dist/blocks.{js,css}
        └──> swift/Sources/Blocks/Gen/*.swift ──> Blocks (Foundation) ──> BlocksUI (SwiftUI)

   drover:  Cargo rev + npm #sha        its data, its `herd` block, its layout.json
   cooee:   Cargo rev + SwiftPM revision   its data, its persona, pairing, home and chat blocks, its layout.json
```

Nothing in this repo names drover or cooee: a ban in `.drover/arch.toml` fails CI on either word in the sources.

## What was read

- blocks `issue-1` at `ee79e2a` (blocks#1: the gates and a placeholder crate; not on `staging` yet).
- drover `origin/staging` at `dd475fcf0`: `web/src/`, `crates/server/src/screens.rs`, `assets/schemes`, `docs/themes.md`.
- drover `issue-1318` at `010f53fe2`: `docs/architecture/screen-hub/` (the row diff and the stream protocol).
- cooee `origin/staging` at `8ca09a316`: `docs/plugins/screens.schema.json`, `docs/architecture/layout-blocks/` and
  `styles-as-packs/`, `apple/Sources/CooeeCore`, `apple/Sources/CooeeUI`, `crates/cooee-server/src/layout.rs`.
