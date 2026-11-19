# Layout and shapes

## The layout, after all six slices

```text
web/src/render/
  kind/<kind>.ts          one per kind HTML draws; nothing else sits directly in this folder
  kind/<kind>/…           a kind's own parts, when its file gets long
  ctx.ts dom.ts act.ts text.ts block.ts     what index.ts exported, by concern (table below)
web/src/gen/kinds.ts      generated: the imports, R, native
web/src/css/
  base/*.css              the page, controls, and every class two kinds use
  kind/<kind>.css         one kind's rules
  shell/*.css             tabs, sheet, confirm and toast
  look/*.css              tiles, motion
web/test/
  kind/<kind>.test.ts     one kind's render tests
  hooks.test.ts           the tests about every kind
  kit.ts                  fixture, ctx, all, part, later; installs the DOM, then imports render
crates/blocks/src/site/
  mod.rs                  the mod lines and the public names            shared, 80 lines
  page.rs                 Head, Live, Look, Site, page, fragment
  write.rs                W, Go and the value readers (esc, get, list, shown, on, sends, one, fields, toned, ticked, badge)
  md.rs                   md, pairs, links, named_link
  kind/mod.rs             kinds! { … }, kids, holder, fallback         shared, 80 lines
  kind/<kind>.rs          the kind's draw
  kind/row/rounds.rs      a kind's own part sits under the kind
crates/blocks/src/codegen/
  mod.rs                  schema, write                                 shared, 80 lines
  model.rs                Ty, Prop, Case, Def and the schema reader
  ts.rs swift.rs theme.rs hooks.rs kinds.rs fixtures.rs                 one area each
crates/blocks/tests/
  site.rs                 the page's tests                              shared, 200 lines
  site_<kind>.rs          one kind's site tests
swift/Sources/BlocksUI/
  BlocksView.swift        BlocksView, its environment keys, Behaved, CardContext
  BlockNode.swift         BlockNode (hidden, disabled, the switch), BlockStack
  ActButton.swift         ActButton, Confirming
  Kind/<Kind>.swift       the kind's view and the views only it uses
docs/schema.md            the first paragraph and five links            frozen
docs/schema/              generated.md blocks.md behaviours.md stream.md versioning.md
```

## The shapes

A web kind keeps the signature it has today, and its export keeps the kind's name:

```ts
// web/src/render/kind/web.ts
import type { Web } from "../../gen/types.ts";
import { el, h, href } from "../dom.ts";
export function web(b: Web): HTMLElement { /* as today */ }
```

The generated table. `native` is the kinds with a file, less `island`, which draws its app's element:

```ts
// web/src/gen/kinds.ts
type Of<K extends Kind> = Extract<Block, { type: K }>;
export const native: readonly Kind[];
export const R: { [K in Kind]: (b: Of<K>, c: Ctx) => HTMLElement | null };
```

`tsc` checks every entry against its kind's type, so a kind file with the wrong export or the wrong argument does
not compile. `web/src/tree.ts` reads `native` from here and stops computing its own.

The generator. Each area gives its files; `mod.rs` writes them and knows no file by name:

```rust
/// One area's generated files: the path under the repo's root, then the text.
type Files = Vec<(String, String)>;

pub fn write(root: &Path) -> std::io::Result<()> {
    let schema = schema();
    for area in [ts::files, swift::files, theme::files, hooks::files, kinds::files, fixtures::files] {
        for (path, text) in area(root, &schema)? { /* create the folder, write the file */ }
    }
    Ok(())
}
```

`kinds::drawn(root)` lists `web/src/render/kind/*.ts` and fails on a name that is no kind. `kinds::files` writes
the table from it, and `fixtures.rs` uses the same list for `fixtures/trees`, where `codegen.rs:180` reads the
folder itself today.

A site kind, and the one list of them:

```rust
// crates/blocks/src/site/kind/web.rs
pub(super) fn draw(w: &mut W<'_>, b: &Value) { /* as views::web today */ }

// crates/blocks/src/site/kind/mod.rs
macro_rules! kinds {
    ($($name:literal => $m:ident,)*) => {
        $(mod $m;)*
        pub(super) fn block(w: &mut W<'_>, b: &Value) {
            match get(b, "type").unwrap_or_default() {
                $($name => $m::draw(w, b),)*
                _ => fallback(w, b),
            }
        }
    };
}
```

`config` draws through `form`'s `pub(super)` function, and `hero` takes `figure` from `media`, as the web renderer
does today. `sheet` and `list` call `holder`.

The build and the test run, in `web/package.json`:

```text
build  esbuild src/shell.ts … --outfile=dist/blocks.js
       && export LC_ALL=C
       && { echo '@layer blocks{'; cat src/css/base/*.css src/css/kind/*.css src/css/shell/*.css src/css/look/*.css; echo '}'; }
          | esbuild --loader=css --minify > dist/blocks.css
test   node --no-warnings --test test/*.test.ts test/kind/*.test.ts
```

## Where each export of `web/src/render/index.ts` goes

| to | exports |
|---|---|
| `render/ctx.ts` | `Blk`, `Post`, `Store`, `Renderer`, `Ctx`, `isBlk`, `obj`, `blks`, `draft`, `sent` |
| `render/dom.ts` | `esc`, `nodes`, `el`, `h`, `href`, `btn` |
| `render/act.ts` | `urlOf`, `sends`, `acts`, `offable`, `toggle` |
| `render/text.ts` | `tone`, `md`, `value`, `ticked`, `tick` |
| `render/block.ts` | `render`, `kids`, `fallback` |
| `gen/kinds.ts` | `R` |
| `render/kind/island.ts` | the `island` entry of `R` |
| deleted | `gap`, the 25 imports |

## Where each rule of `web/src/blocks.css` goes (today's line numbers)

| to | lines |
|---|---|
| `base/root.css`, `base/control.css`, `base/tag.css` | 2 to 9; 11 to 18 and 23 to 24; 26 to 29 |
| `base/bar.css`, `base/field.css` | 67 to 68; 92 to 97 |
| `kind/screen.css`, `section.css`, `list.css` | 31 to 33; 34 to 38; 39 and 41 |
| `kind/row.css` | 40, 42 to 54, 208 to 232, 257 |
| `kind/card.css`, `text.css`, `stat.css`, `chips.css` | 56 to 66; 69 to 72; 73 to 77; 78 to 79 |
| `kind/choice.css`, `run.css`, `web.css` | 19 to 22 and 80 to 82; 83; 87 to 91 |
| `kind/images.css` | 84 to 86, and the viewer, 140 to 144 |
| `kind/config.css`, `form.css`, `secret.css`, `composer.css` | 98 to 116; 117 to 120; 121 to 126; 128 to 138 |
| `kind/diagram.css`, `editor.css`, `scene.css` | 146 to 174; 175 to 186; 187 to 207 |
| `kind/prose.css`, `hero.css`, `media.css`, `nav.css` | 245 to 247; 248 to 249; 250 to 252; 253 to 255 |
| `shell/tabs.css`, `sheet.css`, `notice.css` | 233 to 235; 236 to 240; 241 to 243 |
| `look/tiles.css`, `look/motion.css` | 258 to 260; 261 to 266 |

Three pairs of rules have the same weight and set the same property, so order decides between them today. The
new order keeps each:

| first | then | property | why it holds |
|---|---|---|---|
| `.fd .fk` (92 to 97, fields) | `.cfg .fk` (config) | `flex` | `base/` comes before `kind/` |
| `.list>.row` (list) | `.row.in1` (row) | `padding-left` | `list.css` sorts before `row.css` |
| `.card.accent` (card) | the tile rule at 259 | `border` | `kind/` comes before `look/` |

These are the pairs found by reading. Checked here with a throwaway copy: the stylesheet cut by this table (33
files, every rule once) and built in the new order has the same rules as `web/dist/blocks.css`, and WebKit draws
all 59 fixture screens (`fixtures/blocks` and `fixtures/screens`) at 390 and 1440 to the same PNG as today, 118 of
118. A control with `kind/` before `base/` changes 1 of the 118, so the check sees order, but the fixtures cover it
thinly. Slice 3 repeats the check on its own files.

## Where the rest goes

| from | to |
|---|---|
| `render.test.ts` 19 to 90, 587 | `web/test/hooks.test.ts` |
| `render.test.ts` 91 to 178; 180 to 226; 228 to 296 | `kind/diagram.test.ts`; `kind/web.test.ts`; `kind/editor.test.ts` |
| `render.test.ts` 298 to 411; 413 to 448; 450 to 507; 509 to 585 | `kind/config.test.ts`; `kind/secret.test.ts`; `kind/scene.test.ts`; `kind/row.test.ts` |
| `site/mod.rs` 15 to 104; 106 to 387; 389 to 458 | `site/page.rs`; `site/write.rs`; `site/kind/mod.rs` and `kind/island.rs` |
| `site/views.rs` 7 to 41; 563 to 640; the rest | `site/write.rs`; `site/md.rs`; one `site/kind/<kind>.rs` per `pub(super) fn` |
| `site/content.rs`; `diagram.rs`, `editor.rs`, `scene.rs`; `rounds.rs` | `kind/prose.rs`, `hero.rs`, `media.rs`, `nav.rs`; moved as they are; `kind/row/rounds.rs` |
| `tests/site.rs` 160 to 295 | `tests/site_editor.rs`, `site_config.rs`, `site_scene.rs`, `site_row.rs`, `site_web.rs`, `site_island.rs` |
| `Blocks.swift` | `BlocksView.swift`, `BlockNode.swift`, `Kind/Screen.swift`, `Kind/Section.swift`, `Kind/Sheet.swift`; `Palette.tone` to `Theme.swift` |
| `BlockCards.swift` | `ActButton.swift`, `Kind/Card.swift`, `Kind/Choice.swift` |
| `BlockLeaves.swift` | `Kind/Button.swift`, `Text.swift`, `List.swift`, `Stat.swift`, `Chips.swift`, `Web.swift` |
| the other Swift files that hold a kind's view | `Kind/<Kind>.swift`, one kind each (`BlockContent.swift` is five, `BlockFields.swift` three, `BlockEdits.swift` two) |
| `codegen.rs`: the schema reader, `Ty` to `camel` (403 to 583) | `codegen/model.rs` |
| `Ty::ts`, `ts_props`, `ts`, `ts_defs`, `layout_ts` | `codegen/ts.rs` |
| `Ty::swift`, `Ty::case`, `SWIFT_WORDS` to `swift_defs` (678 to 902), `style_swift`, `layout_swift` | `codegen/swift.rs` |
| `schemes_ts`, `scheme_swift`, `schemes_swift`; `hooks` with `PARTS` and `ACTIONS` | `codegen/theme.rs`; `codegen/hooks.rs` |
| `html`, `site_screen`, `workflow`, `trees`, `expected`, `row`, `sample`, the `fixtures/blocks` loop | `codegen/fixtures.rs` |
| `docs/schema.md` 4 to 18; 20 to 32 and 47 to 51; 33 to 45; 53 to 73; 75 to 88 | `docs/schema/generated.md`; `blocks.md`; `behaviours.md`; `stream.md`; `versioning.md` |

A Swift view that one kind uses goes with that kind. One that several use goes to `Components.swift`.
