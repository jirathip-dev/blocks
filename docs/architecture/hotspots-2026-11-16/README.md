# hotspots: blocks week of 2026-11-16 (#113)

## Summary

Decision: 9 of the 19 files are hot for one reason: a kind is spread over files that every other kind shares. Give
each kind one file per renderer and per test suite, and generate the web table of kinds. Split the generator and
the schema doc by area. Keep the 8 files that are not lists whole, under a size limit.
Slices: this PR marks the 8 that need no move; then six refactors: generator, web kinds, styles, site, Swift, docs.
Open questions: the checker's config and the justfile cannot be split, and nothing measures their size: (1) mark
them shared anyway (recommended)? (2) file a drover issue so their size is measured?

Read this file, then `adr.md` (options, decision, the `.drover/arch.toml` lines), `shapes.md` (the layout, the
shapes, where each export goes) and `boundaries.md` (who may import whom, two statecharts).

## Where it stands (staging a7f642c)

The repo is 16 hours old: 49 commits from Nov 18 22:08 to Nov 19 13:59. The 14-day window is its whole life, so
every count below includes the PR that created the file. drover runs the PRs that touch a listed file one at a
time, one slot per file (`crates/core/src/queue.rs:307` in drover), so 19 listed files are 19 queues.

| file | PRs | predicted conflicts | what the PRs did | ending |
|---|---|---|---|---|
| `web/src/blocks.css` | 12 | 12 | 7 of 13 commits append one kind's rules | a folder, built |
| `web/src/render/index.ts` | 10 | 22 | 7 of 13 swap one import and one table line for a kind | the table generated, the rest by concern |
| `web/test/render.test.ts` | 8 | 31 | 7 of 12 append one kind's tests | one file per kind |
| `crates/blocks/src/site/mod.rs` | 9 | 14 | 6 of 12 add a kind's line to the `match` | the list alone in one small file |
| `crates/blocks/src/site/views.rs` | 6 | 5 | 18 kinds' views in 759 lines | one file per kind |
| `crates/blocks/tests/site.rs` | 6 | 17 | 6 of 9 append one kind's test | one file per kind |
| `swift/Sources/BlocksUI/Blocks.swift` | 7 | 1 | the public view, the `switch` and three kinds' views | split, one file per kind |
| `swift/Sources/BlocksUI/BlockCards.swift` | 5 | 0 | all three recent edits are to `ActButton`, not to a card | split |
| `swift/Sources/BlocksUI/BlockLeaves.swift` | 5 | 1 | six kinds' views | split |
| `web/test/dom.ts` | 5 | 0 | a kind's test needed one more DOM method | shared, 200 lines |
| `crates/blocks/src/codegen.rs` | 6 | 4 | a new output each: a function and a line in `write` | a folder by area |
| `docs/schema.md` | 6 | 2 | a paragraph per wire change | one file per section |
| `README.md` | 5 | 0 | reworded in place | frozen at 46 lines |
| `web/shot/shot.ts` | 6 | 3 | a hook on the in-page harness per feature | shared, 200 lines |
| `web/src/patch.ts` | 5 | 0 | built in two PRs, then 8 lines for three features | shared, 200 lines |
| `web/test/patch.test.ts` | 5 | 0 | follows `patch.ts` | shared, 200 lines |
| `crates/blocks/tests/sim.rs` | 5 | 0 | a generator per feature the sim covers | shared, 520 lines |
| `.drover/arch.toml` | 10 | 4 | a `generated` path, a layer or a ban | shared, open question 1 |
| `justfile` | 6 | 0 | a recipe each | shared, open question 1 |

The first nine rows are one problem, and `dom.ts` follows the render tests. A B14 slice ("draw `web` natively")
had to edit six shared files: the stylesheet, the table of kinds, the render tests, the site's `match`, the
site's views and the site's tests. Seven such slices merged in one day and the eighth (#42) is in review.

## How the callers read, after

A new kind (`table`, #80) is one line in the crate's list of kinds and then only new files:

```text
crates/blocks/src/kind/mod.rs                  Table(Table) = "table",        (the one list, as today)
crates/blocks/src/site/kind/table.rs           pub(super) fn draw(w: &mut W<'_>, b: &Value)
crates/blocks/src/site/kind/mod.rs             "table" => table,              (one line; Rust cannot glob modules)
crates/blocks/tests/site_table.rs              its site tests
web/src/render/kind/table.ts                   export function table(b: Table, c: Ctx): HTMLElement
web/src/css/kind/table.css                     its rules
web/test/kind/table.test.ts                    its render tests
swift/Sources/BlocksUI/Kind/Table.swift        struct TableBlock: View
swift/Sources/BlocksUI/BlockNode.swift         case .table(let table): TableBlock(block: table)   (the compiler asks for it)
```

`just gen` writes the web table from the folder. Nobody edits it, and a conflict in it is settled by running
`just gen` again:

```ts
// web/src/gen/kinds.ts, generated
import { table } from "../render/kind/table.ts";
export const R: { [K in Kind]: (b: Of<K>, c: Ctx) => HTMLElement | null } = { screen, sheet, /* … */ diff: fallback, table };
```

A kind with no file gets `fallback` there, so `gap(42)` and the import list go. The site's list is one macro call
in a file that holds nothing else:

```rust
kinds! {
    "screen" => screen,
    "sheet" => sheet,
    "table" => table,
}
```

The stylesheet is built from the folder: `base/`, then `kind/`, then `shell/`, then `look/`, each by file name.
`web/dist/blocks.css` stays one file, so apps and the crate's `web::CSS` see no change.

A file that is not a list takes any number of PRs at once and cannot grow. A feature that needs more goes in a new
file beside it:

```text
web/src/patch.ts:1: `web/src/patch.ts` is 204 lines, over 200 (baseline None)
```

## Slices

This PR, slice 0: the `.drover/arch.toml` lines that need no move. `shared` with a size limit for `patch.ts`,
`patch.test.ts`, `dom.ts`, `shot.ts`, `sim.rs`, and (open question 1) `arch.toml` and the `justfile`; `frozen` for
`README.md`. Eight files leave the list when it merges.

Then six issues, which the orchestrator files on approve. Each moves code and changes no behaviour, so each is
queued `--refactor` (its tests only move), and each adds its own `arch.toml` lines (`adr.md`, the last section).

| | title | moves | proof it changed nothing | waits for |
|---|---|---|---|---|
| 1 | `codegen: one file per area` | `codegen.rs` to `codegen/` | `just gen` leaves the tree clean | #104 |
| 2 | `web: one file per kind; the table of kinds generated` | `render/index.ts`, the 25 kind files, `render.test.ts` | the same test names pass; `fixtures/` unchanged | 1, #42, #91 |
| 3 | `css: the stylesheet as a folder` | `blocks.css` to `web/src/css/` | every fixture's PNG at 390 and 1440 is the same file before and after | #42 |
| 4 | `site: one file per kind` | `site/mod.rs`, `site/views.rs`, `tests/site.rs` | `just gen` leaves `fixtures/html` and `fixtures/site` unchanged | #42, #91 |
| 5 | `swift: one file per kind` | the BlocksUI view files to `Kind/` | `just swift` passes, tests untouched | #91 |
| 6 | `docs: the schema doc per section` | `docs/schema.md` to `docs/schema/` | the text moves word for word | none |

Slices 2 to 5 rename many files, so each conflicts with any open PR on a kind. The "waits for" column names the
open PRs that touch the same files today. #80 (`table`), #81 (React) and #45 (desktop) should start after them: a
new kind and a new renderer are then new files only.

Lines: `src/` net about +230, all of it `use` and `import` headers of the new files (site +100, Swift +60, the
generator +35, web +20 after 60 lines of imports and table move into the generated file). Headroom is 909 today
and 697 with the open PRs, so no raise is asked.
