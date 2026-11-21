# ADR: hotspots, second report: a fact about a kind is written once (#321)

## Summary

Decision: 8 of the 27 files are hot because a fact about a kind (how many there are, its role, its name, where its
children sit, which view draws it) is copied by hand into a file all kinds share: write each fact once and generate
the rest. Split the 7 files that hold several jobs, write the look's CSS once, keep the 9 quiet files under a limit.
Slices: this PR marks 13 files and removes the hand-written counts; then seven issues: kind facts generated, the other
20 Swift kinds one file each, the Swift harness, the Swift checks as gates, the web shell, the web bundles, the look's CSS.
Open questions: should the Swift gates also run on a lane's own macOS host at every done, or in CI only (recommended)?

Status: proposed (architect lane, 2026-11-21). Read `README.md` first: it has the table of all 27 files.

## Question

#113 gave each kind one file per renderer, and 27 more files are hot three days later. Which of them still hold
a line per kind, which are something else, and what takes each one off the list for good?

## Where it stands

- Four test files state how many kinds there are, or list them. `web/test/shot.test.ts:68` and `:85`, `SnapshotTests.swift:65`,
  `site/tests/pages.rs:30`, `:79`, `:82` and `:159`, and the list at `web/react/test/markup.test.ts:71`. Of the 72
  commits to those four files, 48 changed one of those lines. They hold 92 of the report's predicted conflicts.
  `RenderTests.swift:15` and `:19` list the kinds twice more.
- `fixtures/blocks` is generated from each kind's sample, so a count of its files checks nothing the generator
  does not. `Block::KINDS`, `Block.tags` and the keys of `hooks` are the list in Rust, Swift and TypeScript.
- `Tree.swift:81` to `:160` is three tables over the kinds: `head` (variant and action), `roles`, `named`.
  They copy `tree::VARIANTS`, `ROLES` and `NAMES` (`tree.rs:11` to `:40`), which `codegen/hooks.rs` already
  writes for the web as `web/src/gen/hooks.ts`.
- Where a kind keeps its children is written three times: `patch.rs:108` (`list`, `lists`), `core/apply.ts:7`
  and `:8` (`walked`, `hosts`), `Apply.swift:217` and `:278`.
- `codegen/swift/kinds.rs` writes `KindView` from the files in `BlocksUI/Kind/`: 17 kinds. `BlockNode.swift:33`
  to `:61` is a second `switch`, by hand, for the 20 kinds whose views are in 12 other files.
- `Snapshot.swift:76` is one function of 106 lines, kept by a baseline. It holds the run's state as 13 local
  variables, and passes four of them by hand to `draw` at 8 places.
- `swift.yml` names each fixture folder twice, once for `push` and once for `pull_request`. 8 of its 9 commits
  changed those two lines. #319 moved the web, React and bench jobs to `.gatekeeper/gates/`, one file each; the
  Swift workflow was to "stay as [it was] for now".
- `web/src/shell.ts` is 500 lines, the most a file may have: the next PR that adds a line fails arch-check. Its
  `draw` is 244 lines, kept by a baseline. `mount` and `adopt` each build a `Ctx`, a patcher and an action post:
  #136, #140 and #296 each edited both.
- `web/package.json`'s `build` is one line. Six bundles are named there, in `knip.json`, in `arch.toml` and,
  for three of them, in `site/src/main.rs:143`.
- `scheme.rs:271` (`axes`) and `look.ts:42` (`axes`) are the same function in two languages. `fixtures/css` holds
  them equal. `look.ts:38` repeats the three easing curves of `Easing::curve`.
- `.drover/arch.toml` is 574 lines against a written limit of 300, held by a baseline that PRs raise.

## Options

| | Option | Verdict |
|---|---|---|
| A | Leave it: the counts decay in 14 days | no: `shell.ts` is full today, and every next kind, style value and bundle edits the same lines again |
| B | Mark all 27 `shared` under a limit, move nothing | no: the PRs stop queueing but a count is still one line that two kinds both change |
| C | Write each fact once and generate the copies; split what has several jobs; `shared` under a limit for the rest | **chosen** |
| D | Also move each kind's role, variant and child list from `tree.rs` and `patch.rs` into its own `kind/core/<kind>.rs` | no: neither file is hot; three short tables in the crate are the one copy this ADR keeps |
| E | Keep `swift.yml` and have it run every script in a new `ci/swift/` | no: a second way to add a check, beside the gates folder #319 made |

## Decision

1. **The rule.** A fact about a kind is written once, in the crate. Another language gets it from `just gen`. A
   test that needs every kind walks the generated list, and no test states a number of kinds or of fixtures.
2. **Counts (slice 0).** The tests lose their numbers and lists. `shot.test.ts` and `SnapshotTests.swift` require one
   `fixtures/blocks` file for each kind in the list. `pages.rs` builds its numbers from `Block::KINDS.len()`.
   `markup.test.ts` loops `native` without naming it, and its per-kind cases move to
   `web/react/test/markup/<kind>.json`, each an array of blocks, read by folder. `RenderTests.swift` draws
   `fixtures/blocks/<kind>.json` for every kind in `Block.tags`, in place of its two lists.
3. **A kind's facts in Swift (slice 1).** `just gen` writes `variant`, `source`, `named`, `roles` and `names` into
   `BlocksUI/Gen/Kinds.swift`, from the same three constants `hooks.ts` comes from and from the schema: a
   kind's `named` is the `NAMES` it has, in `NAMES`'s order; its `source` is the `action`, `tap` and `values`
   it has. `Tree.swift` keeps the drawn tree, the role's own rules and the app block's arm.
4. **Child lists (slice 1).** `patch.rs` states them as two constants beside `list` and `lists`, and a test
   holds each kind's sample to them. `just gen` writes them into `hooks.ts` and into a new
   `Blocks/Gen/Kinds.swift`; `core/apply.ts` and `Apply.swift` read them. Swift walks every listed key on any
   block, as TypeScript does.
5. **The other 20 Swift kinds (slice 2).** Each view moves to `BlocksUI/Kind/<Kind>.swift` as `<Kind>Block`.
   A view two kinds use moves to `BlocksUI/Part/`, one file each. `KindView` then covers every kind, and a kind
   with no file fails `just gen`. `BlockNode.swift` keeps hidden, disabled, empty and the three modifiers.
6. **The Swift harness (slice 3).** A run's state is one value, `Run`. Each step is a method of `Run` in its own
   file under `BlocksSnapshot/Step/`. `Snapshot.run` is the loop and one `switch` line per step. Each kind's
   render tests move to `Tests/BlocksTests/Render/<Kind>Tests.swift`; their helpers to `Render/Kit.swift`.
7. **The Swift checks (slice 4).** Each of `swift.yml`'s five steps becomes a gate file on a new macOS leg:
   `swift-lint`, `swift-test`, `swift-snap`, `swift-plan`, `swift-stress`. Each names `fixtures/**`, not a folder
   at a time, as the web gate does. `swift.yml` is deleted.
8. **The shell (slice 5).** `shell.ts` keeps only the bundle's exports. Its code moves to `web/src/shell/`:
   `layout`, `store`, `look`, `host`, `sheet`, `mount`, `adopt`. `host` is the one place a screen's `Ctx`, its
   patcher and its kept state are made; `mount` and `adopt` both call it. No function there is over 80 lines.
9. **The bundles (slice 6).** A bundle is `web/bundle/<name>.json`: its entry, whether it is minified, what stays
   external, and which other bundles it `uses`. `web/build.mjs` builds each to `dist/<name>.js`, turns an import
   of a used bundle's entry into `./<name>.js`, then writes the two stylesheets and the types as today.
10. **The look's CSS (slice 7).** Each style enum has `css()` beside it, with one arm per value. `theme/css.rs`
    holds `css`, `axes` and the label selectors, moved from `scheme.rs`. `just gen` writes every value's rule,
    the curves, the selectors and the `Scale` type into `web/src/gen/schemes.ts`; `look.ts` loops them.
    `tests/theme.rs` becomes `theme_scheme.rs`, `theme_css.rs`, `theme_style.rs` and `theme_pack.rs`. The test
    with a row per value walks every value of every enum instead.
11. **Quiet files.** A file that is one concern is `shared` under a limit just above its size today. When it is
    full, the next feature goes in a new file beside it. For `BlocksView.swift` that means its `init` stays as
    it is and a new app hook is a view modifier in its own file.
12. **Not done.** `.drover/rules.md` is not split: drover reads that one path, and `core/cap` already holds it
    to 30 lines. `knip.json` keeps its list of entries: `ts/knip` fails a bundle that is not on it. The site's
    list of the four files it ships stays. The desktop, demo and compat workflows are not hot and stay.

## Consequences

- A PR that adds a kind edits no test's count, no Swift `switch` and no table of child lists.
- Slice 1 changes three things Swift does, each toward what Rust does: a `pages` block with no title is named by
  its `file`; a tap on a `chart` sends its `tap`; a tap on an `import` sends its `action`. The slice's PR names
  each, and compares the two taps with what `blocks-shot` sends for the same step before it keeps them.
- Slice 4 puts Swift in the one `gates` run, whose `gates / done` #319 asks the owner to require. The Swift leg
  adds a macOS job to that run, in place of the `swift` workflow's.
- Slice 5 removes `web/src/shell.ts:draw 244` from the baseline, and slice 3 `Snapshot.swift:run 106`.
- Slice 7 moves the test `scripts/gen.sh` names in its last line to `--test theme_css`.
- `BlocksView`'s parameters stay, so no app changes a call. A hook added later reads as a modifier.
- `arch.toml` grows by about 50 lines in slice 0, so its baseline line is raised once more. In slices 1
  and 6, 13 `generated` paths become 3 globs, and a new bundle or generated Swift file then adds no line.
- `web/build.mjs` is about 45 lines of JavaScript outside the paths the cap counts, as `web/lint.mjs` is.
- Each open PR on a moved file takes one update round. Today that is #304 and #314, both in slice 0's files.
- `src/` net about +150 lines. Headroom is 22,820 with the open PRs. No raise is asked.
- Run here, in a scratch folder, with esbuild 0.28.2: the six bundles through esbuild's API, with `uses`
  resolved by the entry's path, and both stylesheets through `transform`. All eight outputs and
  `src/gen/scoped.css` are byte for byte the files in `web/dist` at 9ccddad. Not run here: `tsc` for the types
  (its command does not change), any Swift, and the macOS leg. The pinned gatekeeper 1.0.0 names a `macos`
  platform and maps it to `macos-latest`; no leg in this repo uses it yet. If slice 4's first push shows it
  cannot run, the slice stops with a gatekeeper issue and `swift.yml` stays listed.

## Open questions for the owner

1. **The Swift gates on a lane's host.** CI only (recommended): each gate's script starts with the `CI` test
   that `local/gen` uses, so `drover turn done` on a macOS host skips them and a lane still runs `just swift` by
   hand. A Swift break shows one push later, as today. Or also at every done: the break is caught before the
   push, and each done that touches `swift/**` or `fixtures/**` then runs `swift test` and 164 harness
   launches on the shared host.

## The `.drover/arch.toml` lines

Slice 0, this PR. Appended to `shared`; the tables go below the existing ones:

```toml
shared = [
    ".drover/rules.md",
    "web/test/shot.test.ts",
    "web/react/test/markup.test.ts",
    "site/src/main.rs",
    "site/tests/pages.rs",
    "crates/blocks-desk/tests/desk.rs",
    "crates/blocks-desktop/src/stage.rs",
    "swift/Tests/BlocksTests/ApplyTests.swift",
    "swift/Tests/BlocksTests/SnapshotTests.swift",
    "swift/Sources/BlocksUI/AppBlocks.swift",
    "swift/Sources/BlocksUI/BlocksView.swift",
    "swift/Sources/BlocksUI/Look+Style.swift",
    "swift/Sources/BlocksUI/Theme.swift",
]

[[size]]
paths = [".drover/rules.md"]
max_file_lines = 30

[[size]]
paths = ["swift/Sources/BlocksUI/AppBlocks.swift"]
max_file_lines = 100

[[size]]
paths = ["web/react/test/markup.test.ts"]
max_file_lines = 120

[[size]]
paths = ["swift/Sources/BlocksUI/Look+Style.swift", "swift/Sources/BlocksUI/Theme.swift"]
max_file_lines = 140

[[size]]
paths = ["swift/Sources/BlocksUI/BlocksView.swift", "site/src/main.rs"]
max_file_lines = 170

[[size]]
paths = ["crates/blocks-desktop/src/stage.rs", "site/tests/pages.rs"]
max_file_lines = 250

[[size]]
paths = ["swift/Tests/BlocksTests/SnapshotTests.swift", "swift/Tests/BlocksTests/ApplyTests.swift"]
max_file_lines = 290

[[size]]
paths = ["web/test/shot.test.ts"]
max_file_lines = 320

[[size]]
paths = ["crates/blocks-desk/tests/desk.rs"]
max_file_lines = 460
```

Slice 1, kind facts. In `generated`, one glob replaces the five `swift/Sources/Blocks/Gen/` paths:

```toml
generated = ["swift/Sources/Blocks/Gen/*.swift"]   # replaces Blocks, Schemes, Style, LayoutShapes, Words; Kinds is new
shared = ["swift/Sources/BlocksUI/Tree.swift", "swift/Sources/Blocks/Apply.swift"]   # appended

[[size]]
paths = ["swift/Sources/BlocksUI/Tree.swift"]
max_file_lines = 200
```

`Apply.swift` joins the 290-line table.

Slice 2, the Swift kinds. `BlockNode.swift` joins the 100-line table:

```toml
frozen = [                                            # appended
    "swift/Sources/BlocksUI/BlockRows.swift",
    "swift/Sources/BlocksUI/BlockFields.swift",
    "swift/Sources/BlocksUI/Components.swift",
]
shared = ["swift/Sources/BlocksUI/BlockNode.swift"]   # appended

[[collect]]
dir = "swift/Sources/BlocksUI/Part"
glob = "*.swift"
```

Slice 3, the Swift harness. Both paths join the 200-line table:

```toml
shared = ["swift/Sources/BlocksSnapshot/Snapshot.swift", "swift/Tests/BlocksTests/RenderTests.swift"]   # appended
```

Slice 4, the Swift checks. `.gatekeeper/gates` is collected already:

```toml
frozen = [".github/workflows/swift.yml"]   # appended
```

Slice 5, the shell:

```toml
shared = ["web/src/shell.ts"]   # appended

[[size]]
paths = ["web/src/shell.ts"]
max_file_lines = 40

[[ban]]
pattern = "patcher("
paths = ["web/src/shell/**"]
except = ["web/src/shell/host.ts"]
reason = "one way to draw a screen: mount and adopt take their Ctx and their patcher from host"
```

Slice 6, the bundles. In `generated`, two globs replace the eight `web/dist/*.js` and `web/dist/*.css` paths.
`web/package.json` joins the 30-line table:

```toml
generated = ["web/dist/*.js", "web/dist/*.css"]   # replaces blocks, core, play, import, scan, react and both stylesheets
shared = ["web/package.json"]                     # appended
```

Slice 7, the look's CSS. `scheme.rs` joins the 250-line table and `look.ts` the 100-line one:

```toml
frozen = ["crates/blocks/tests/theme.rs"]                                   # appended
shared = ["crates/blocks/src/theme/scheme.rs", "web/src/core/look.ts"]      # appended

[[collect]]
dir = "crates/blocks/tests"
glob = "theme_*.rs"
```
