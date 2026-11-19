# ADR: hotspots week of 2026-11-16: a kind is one file per renderer (#113)

## Summary

Decision: 9 of the 19 files are hot for one reason: a kind is spread over files that every other kind shares. Give
each kind one file per renderer and per test suite, and generate the web table of kinds. Split the generator and
the schema doc by area. Keep the 8 files that are not lists whole, under a size limit.
Slices: this PR marks the 8 that need no move; then six refactors: generator, web kinds, styles, site, Swift, docs.
Open questions: the checker's config and the justfile cannot be split, and nothing measures their size: (1) mark
them shared anyway (recommended)? (2) file a drover issue so their size is measured?

Status: proposed (architect lane, 2026-11-19). Read `README.md` first: it has the table of all 19 files.

## Question

The report lists 19 files, and drover runs the PRs that touch a listed file one at a time. Which of them are lists
of kinds, which are something else, and what takes each one off the list without the same collisions coming back
under a new name?

## Where it stands

- The window is the repo's whole life: 49 commits in 16 hours. Every file's count includes its own creation.
- `web/src/render/index.ts:6` to `:30` imports the 25 kind renderers by name and `:167` to `:198` lists them again
  in `R`. A slice that draws a kind edits both. 22 predicted conflicts, 5 update rounds.
- `web/src/blocks.css` is one `@layer` of 267 lines. A kind's rules go at the end, where the next kind's go too.
- `web/test/render.test.ts` is 596 lines: seven kinds' tests one after another. 31 predicted conflicts.
- `crates/blocks/src/site/mod.rs:395` is a `match` with one arm per kind, in the same file as the page writer and
  the HTML writer `W`. `site/views.rs` holds 18 kinds' views and is 759 of the 1,000 lines a file may have.
- `crates/blocks/src/codegen.rs` is 902 of 1,000 lines: the schema reader, the TS and Swift writers, the theme and
  layout outputs and every fixture writer, all behind one list of files in `write` (`:46`).
- `crates/blocks/src/codegen.rs:180` already reads `web/src/render/` to learn which kinds HTML draws. So the
  folder is the truth today, and the table in `index.ts` is a second copy of it kept by hand.
- Eight files are not lists. Six of them have no predicted conflict at all (`patch.ts`, `patch.test.ts`, `dom.ts`,
  `sim.rs`, the `justfile`, `README.md`).
- `drover arch-check`, at the build CI pins (`9ea69d9`), measures a file's size only for `.rs`, `.ts` and `.tsx`
  (`arch.rs:182`), skips folders whose name starts with a dot, and reads each `generated` entry as one path
  (`arch.rs:348`). So a size limit on a Swift file, the `justfile` or `arch.toml` is not checked, and arch-check
  never compares the 6 entries of `generated` that hold a `*` (the fixture folders; tests hold some of them).

## Options

| | Option | Verdict |
|---|---|---|
| A | Leave it: the B14 burst is over and the counts decay in 14 days | no: #80 (a new kind), #91 and #104 (every kind) and two new renderers are queued, and 19 files stay one PR at a time until then |
| B | Mark all 19 `shared` with a size limit, move nothing | no: PRs stop queueing but still collide, each appending at the same place in the same six files |
| C | One file per kind and a generated web table; split by area what has areas; `shared` with a tight limit for the rest | **chosen** |
| D | Generate every list from the crate's list of kinds: a Rust build script for the site, a generated Swift `switch` | no: a build script outside the paths the cap counts and four renamed Swift views, to save one line per kind in two small files |

## Decision

1. **The rule.** A kind is one file per renderer and one per test suite, each in a folder named `kind`. What two
   kinds share lives outside that folder. `shapes.md` has the whole layout.
2. **The web table is generated.** `web/src/render/index.ts` is deleted. The 25 kind files move to
   `web/src/render/kind/`, and the island's renderer joins them as `island.ts`. `just gen` writes
   `web/src/gen/kinds.ts` from that folder: the imports, the table `R` and the list `native`. A kind with no file
   gets `fallback`, so `gap` goes. A file there that names no kind fails the generator. The helpers `index.ts`
   exported move to five files by concern (`ctx`, `dom`, `act`, `text`, `block`); no file re-exports them.
3. **Web tests.** Each kind's tests move to `web/test/kind/<kind>.test.ts`. The tests that are about every kind
   (hooks, the fallback, app kinds, `data-action`) become `web/test/hooks.test.ts`. The helpers they share
   (`fixture`, `ctx`, `part`) go to `web/test/kit.ts`. `render.test.ts` is deleted. `npm test` runs
   `test/*.test.ts test/kind/*.test.ts`; `test/pages/` stays out of it, as today.
4. **Styles.** `web/src/blocks.css` becomes `web/src/css/`: `base/` (the page, controls, and what two kinds
   share), `kind/<kind>.css`, `shell/`, `look/` (tiles, motion). `npm run build` joins them in that order, each
   folder by file name, inside the one `@layer blocks`, and minifies to `web/dist/blocks.css` as today.
5. **The static site.** `site/views.rs` becomes `site/kind/<kind>.rs`, each with `draw`. `site/mod.rs` keeps its
   `mod` lines and its public names. The page moves to `site/page.rs`, the writer `W` to `site/write.rs`, the
   markdown to `site/md.rs`. The list of kinds is one macro call in `site/kind/mod.rs`, which holds only that, the
   fallback and `kids`. Each kind's site tests move to `crates/blocks/tests/site_<kind>.rs`; `tests/site.rs` keeps
   the page's tests.
6. **Swift.** Every kind's view moves to `swift/Sources/BlocksUI/Kind/<Kind>.swift`. `Blocks.swift` becomes
   `BlocksView.swift` (the public view and its environment) and `BlockNode.swift` (the `switch`). `ActButton`, which
   took every recent edit to `BlockCards.swift`, gets its own file. SwiftPM compiles the folder as it is.
7. **The generator.** `codegen.rs` becomes `codegen/`: the schema reader, then one file per area (TS, Swift, theme,
   hooks, kinds, fixtures). Each area returns its files as paths and text; `mod.rs` writes them.
8. **Docs.** `docs/schema.md` keeps its first paragraph and a table of links, and is frozen. Its five sections
   become `docs/schema/generated.md`, `blocks.md`, `behaviours.md`, `stream.md` and `versioning.md`, word for word.
   `README.md` is shared under a 70-line limit (q2278): approved work still adds a line to it; a new subject is a
   file in `docs/`.
9. **Shared files.** A file that is one concern, not a list, is marked `shared` under its own limit, set just above
   its size today: `patch.ts`, `patch.test.ts`, `dom.ts` and `shot.ts` at 200 lines, `sim.rs` at 520, and after
   their slices `tests/site.rs` at 200 and the three `mod.rs` files that hold a list at 80. When one is full, the
   next feature goes in a new file. For `shot.ts` the seam is known: the in-page harness is one function handed to
   the browser, so a new capability is its own function in its own file, evaluated after `boot`. Only an ADR adds
   a `shared` line.
10. **`.drover/arch.toml` and the `justfile`.** Neither can become a folder: drover reads one `arch.toml` and
    refuses a key it does not know, and `just` imports a file by name, never by pattern. Both are marked `shared`.
    Open question 1.
11. **Not done.** No Rust build script and no generated Swift `switch`: those two lists are one line per kind in
    a file of their own. No nested cascade layers: they would change which rule wins. `shot.ts`, `sim.rs` and the
    `justfile` are not split now: none has a list in it, and the limit is what makes the next PR split them.

## Consequences

- A slice that draws a kind touches its own files, one line in `site/kind/mod.rs` and one in `BlockNode.swift`.
  `web/src/gen/kinds.ts` is rebuilt, never merged.
- Every listed file leaves the list when its slice merges: 8 with this PR (6 if question 1 is answered "leave
  them listed"), the other 11 over slices 1 to 6.
- Moved files start at zero in next week's report. One that gets hot again was split along the wrong line.
- The order of the rules in `web/dist/blocks.css` changes once, from history's order to folder order. Where two
  rules of the same weight set the same property, order decides. Three such pairs are known and the new order
  keeps each (`shapes.md`). For one, rules move: `.fd .fk` and `.cfg .fk` both set `flex`, and config wins today
  only because it comes later, so the field rules that form, config and secret share go to `base/field.css`.
- The split moves rules and changes none. `.fl` names both a card's fold line and a field's label, so the fold
  line takes the label's `display: contents` today. That stays as found, for its own issue.
- 22 design mockups link `web/src/blocks.css`; slice 3 points them at `web/dist/blocks.css`.
- Six more Rust test binaries. One builds in 0.6 to 0.8 s here (measured on `tests/site.rs` and `tests/tree.rs`).
- `git blame` follows a renamed file. For a file that was split it shows the slice's commit, unless run with `-C`.
- Each open PR on a kind takes one update round when slices 2 to 5 merge. That is why they wait for #42 and #91.
- A new generated file still adds one line to `generated` in `arch.toml`: arch-check compares only whole paths.
- `src/` net about +230 lines, all `use` and `import` headers of new files. No raise is asked.
- Run here, on a throwaway copy: the stylesheet cut into the 33 files of `shapes.md` and built in folder order,
  through esbuild 0.28.2 reading stdin, has the same rules as today's, and all 59 fixture screens draw to the same
  PNG at 390 and 1440. Cut into three parts and joined in today's order, it is `web/dist/blocks.css` byte for
  byte. Not run here: any `just` recipe (this host has no `just`), and no other slice was prototyped.

## Open questions for the owner

1. **`arch.toml` and the `justfile`.** Mark them `shared` (recommended): their PRs stop queueing one at a time, and
   a collision costs an update round, as it does now. The `[[size]]` rule that `shared` requires is written but not
   measured for these two. Or leave them listed: then each stays a one-slot queue, and next week's report names
   them again, because every slice here edits `arch.toml`.
2. **A drover issue** (recommended: file it). arch-check should measure `max_file_lines` for every file a
   `[[size]]` rule names, whatever its extension and under `.drover/` too; #115 needs the same for Swift. And it
   should compare a `generated` entry that holds a `*`, file by file. With the second part, `generated` can name
   `web/src/gen/*.ts` once, and a new generated file adds no line to `arch.toml`.

## The `.drover/arch.toml` lines

Slice 0, this PR. The top-level `shared` replaces today's; the tables go below the existing ones. With "leave them
listed" on question 1, drop `.drover/arch.toml` and `justfile` from `shared` and drop the last table.

```toml
shared = [
    "crates/blocks/src/lib.rs",
    "crates/*/tests/support/**",
    "crates/blocks/tests/sim.rs",
    "web/src/patch.ts",
    "web/test/patch.test.ts",
    "web/test/dom.ts",
    "web/shot/shot.ts",
    ".drover/arch.toml",
    "justfile",
    "README.md",
]

[[collect]]
dir = "docs"
glob = "*.md"

[[size]]
paths = ["web/src/patch.ts", "web/test/patch.test.ts", "web/test/dom.ts", "web/shot/shot.ts"]
max_file_lines = 200

[[size]]
paths = ["crates/blocks/tests/sim.rs"]
max_file_lines = 520

[[size]]
paths = [".drover/arch.toml", "justfile"]
max_file_lines = 300

[[size]]
paths = ["README.md"]
max_file_lines = 70
```

Slice 1, the generator. `codegen.rs` is deleted. The `codegen` layer and the `std::fs` ban name the folder:

```toml
shared = ["crates/blocks/src/codegen/mod.rs"]   # appended to the list above

[[size]]
paths = ["crates/blocks/src/codegen/mod.rs"]
max_file_lines = 80

[[layer]]
name = "codegen"
paths = ["crates/blocks/src/codegen/**", "crates/blocks/src/bin/**"]   # was codegen.rs; mods and may_use unchanged

[[ban]]
pattern = "std::fs"
paths = ["crates/*/src/**"]
except = ["crates/blocks/src/codegen/**"]   # was codegen.rs; reason unchanged
```

Slice 2, web kinds:

```toml
frozen = ["web/src/render/index.ts", "web/test/render.test.ts"]   # appended
generated = ["web/src/gen/kinds.ts"]                               # appended; `generate = "just gen"` as today

[[collect]]
dir = "web/src/render/kind"
glob = "*.ts"

[[collect]]
dir = "web/test/kind"
glob = "*.test.ts"

[[ban]]
pattern = "gen/kinds.ts"
paths = ["web/src/render/kind/**"]
reason = "a kind draws one block; only block.ts reads the table of kinds"
```

Slice 3, styles:

```toml
frozen = ["web/src/blocks.css"]   # appended

[[collect]]
dir = "web/src/css"
glob = "**/*.css"
```

Slice 4, the static site. The two `mod.rs` paths join the 80-line `[[size]]` table and `tests/site.rs` the 200-line one:

```toml
frozen = ["crates/blocks/src/site/views.rs"]   # appended
shared = [                                      # appended
    "crates/blocks/src/site/mod.rs",
    "crates/blocks/src/site/kind/mod.rs",
    "crates/blocks/tests/site.rs",
]

[[collect]]
dir = "crates/blocks/src/site/kind"
glob = "*.rs"

[[collect]]
dir = "crates/blocks/tests"
glob = "site_*.rs"
```

Slice 5, Swift:

```toml
frozen = [                                      # appended
    "swift/Sources/BlocksUI/Blocks.swift",
    "swift/Sources/BlocksUI/BlockCards.swift",
    "swift/Sources/BlocksUI/BlockLeaves.swift",
]

[[collect]]
dir = "swift/Sources/BlocksUI/Kind"
glob = "*.swift"
```

Slice 6, the schema doc:

```toml
frozen = ["docs/schema.md"]   # appended

[[collect]]
dir = "docs/schema"
glob = "*.md"

[docs]
paths = ["docs/*.md", "docs/schema/*.md", "README.md"]   # skip unchanged
```
