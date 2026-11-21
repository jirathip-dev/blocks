# hotspots: blocks week of 2026-11-16, second report (#321)

## Summary

Decision: 8 of the 27 files are hot because a fact about a kind (how many there are, its role, its name, where its
children sit, which view draws it) is copied by hand into a file all kinds share: write each fact once and generate
the rest. Split the 7 files that hold several jobs, write the look's CSS once, keep the 9 quiet files under a limit.
Slices: this PR marks 13 files and removes the hand-written counts; then seven issues: kind facts generated, the other
20 Swift kinds one file each, the Swift harness, the Swift checks as gates, the web shell, the web bundles, the look's CSS.
Open questions: should the Swift gates also run on a lane's own macOS host at every done, or in CI only (recommended)?

Read this file, then `adr.md` (options, decision, the `.drover/arch.toml` lines), `shapes.md` (the layout and the
shapes) and `boundaries.md` (who may import whom, three statecharts). The first report of this week is
`../hotspots-2026-11-16/` (#113); this one keeps its rules and finishes two things it left half done.

## Where it stands (staging 9ccddad)

The repo is three days old: 154 commits from Nov 18 22:08 to Nov 21 18:49, so the 14-day window is its whole
life. "PRs" and "conflicts" are the report's numbers. "Shared line" counts, from git, the commits to the file
that changed the one line or table named beside it.

| file | PRs | conflicts | why it is hot | shared line | ending | slice |
|---|---|---|---|---|---|---|
| `web/test/shot.test.ts` | 7 | 49 | two counts of kinds and fixtures (`39`, `85`) | 14 of 27 | counts gone; shared, 320 lines | 0 |
| `site/tests/pages.rs` | 5 | 21 | four counts of kinds (`8 + 37`, `38`) | 13 of 16 | counts from `Block::KINDS`; shared, 250 | 0 |
| `swift/Tests/BlocksTests/SnapshotTests.swift` | 5 | 11 | one count of kinds | 12 of 19 | count gone; shared, 290 | 0 |
| `web/react/test/markup.test.ts` | 5 | 11 | the list of kinds React draws, and one case per kind on the next line | 9 of 10 | list gone, cases one file a kind; shared, 120 | 0 |
| `swift/Sources/BlocksUI/Tree.swift` | 6 | 28 | a kind's variant, role, name and action, by hand, in three tables | 12 of 18 | generated; shared, 200 | 1 |
| `swift/Sources/Blocks/Apply.swift` | 7 | 0 | where a kind keeps its children, by hand, a third time | 3 of 9 | generated; shared, 290 | 1 |
| `swift/Sources/BlocksUI/BlockNode.swift` | 5 | 20 | a `switch` line for each of the 20 kinds outside `Kind/` | 6 of 9 | generated; shared, 100 | 2 |
| `swift/Tests/BlocksTests/RenderTests.swift` | 6 | 20 | two lists of kinds, and a test per kind added at one place | 9 of 17 | lists gone; then `Render/<Kind>Tests.swift`; shared, 200 | 0, 3 |
| `swift/Sources/BlocksUI/BlockRows.swift` | 8 | 1 | row's view and four parts other kinds use | | `Kind/Row.swift` and `Part/`; frozen | 2 |
| `swift/Sources/BlocksUI/BlockFields.swift` | 5 | 1 | run, secret, form and the field row | | `Kind/`, `Field/`; frozen | 2 |
| `swift/Sources/BlocksUI/Components.swift` | 6 | 0 | six parts | | `Part/`, one file each; frozen | 2 |
| `swift/Sources/BlocksSnapshot/Snapshot.swift` | 6 | 21 | one 106-line `run`: every step's code and all its state | | a `Run` and one file per step; shared, 200 | 3 |
| `.github/workflows/swift.yml` | 6 | 5 | a step per check, and each fixture folder named twice in `paths` | 8 of 9 | one gate file per check; frozen | 4 |
| `web/src/shell.ts` | 10 | 22 | 500 of the 500 lines it may have; five jobs; a screen's `Ctx` built in two places | | `web/src/shell/`; the entry shared, 40 | 5 |
| `web/package.json` | 5 | 15 | the build is one line of 1,500 characters | 8 of 12 | `web/bundle/`, one file a bundle; shared, 30 | 6 |
| `crates/blocks/src/theme/scheme.rs` | 5 | 4 | the look's CSS writer: a rule per value of a style setting | | the rule beside its value; shared, 250 | 7 |
| `web/src/core/look.ts` | 5 | 4 | the same writer again, by hand | | reads the generated rules; shared, 100 | 7 |
| `crates/blocks/tests/theme.rs` | 7 | 8 | four areas' tests; one table with a row per value | | `theme_<area>.rs`; frozen | 7 |
| `.drover/rules.md` | 10 | 11 | a line per rule; 29 of the 30 lines it may have | | shared, 30 | 0 |
| `swift/Tests/BlocksTests/ApplyTests.swift` | 7 | 0 | follows `Apply.swift` | | shared, 290 | 0 |
| `crates/blocks-desk/tests/desk.rs` | 5 | 0 | the desktop's six slices, in order, never two at once | | shared, 460 | 0 |
| `crates/blocks-desktop/src/stage.rs` | 5 | 0 | the same six slices | | shared, 250 | 0 |
| `site/src/main.rs` | 5 | 0 | the site's entry; five PRs, five reasons | | shared, 170 | 0 |
| `swift/Sources/BlocksUI/AppBlocks.swift` | 5 | 0 | an app's hooks | | shared, 100 | 0 |
| `swift/Sources/BlocksUI/BlocksView.swift` | 5 | 0 | four lines per app hook: a parameter, a property, an `init` line, an environment line | | shared, 170; a new hook is a modifier | 0 |
| `swift/Sources/BlocksUI/Look+Style.swift` | 5 | 0 | the look's helpers and shared sizes | | shared, 140 | 0 |
| `swift/Sources/BlocksUI/Theme.swift` | 5 | 0 | the palette, the look, shared sizes | | shared, 140 | 0 |

Three causes cover the first 18 rows:

1. **A fact about a kind, copied by hand** (the first 8 rows). The crate already holds each fact once:
   `Block::KINDS`, `tree::VARIANTS`, `ROLES` and `NAMES`, `patch.rs`'s lists. The web reads them from generated
   files. Swift and the tests copy them. #296 (`message`) edited 14 of the 27 files.
2. **One file, several jobs** (the next 7 rows). `Kind/` holds 17 kinds' views today; the other 20 kinds' views
   sit in 12 older files, behind a `switch` kept by hand. The web build is one shell line, the Swift job one list.
3. **One rule, written per language** (`scheme.rs`, `look.ts`, `theme.rs`). #221, #222 and #223 each added one
   value to a style setting and each edited the same function in Rust and in TypeScript: 5 update rounds.

The last 9 rows are one concern each, and none but `rules.md` had a predicted conflict. They stay whole.

## How the callers read, after

A new kind (`rating`) edits no count, no Swift `switch` and no table of child lists. Beside the files #113 gave it:

```text
crates/blocks/src/kind/core/rating.rs        its fields, as today; a role or a variant is a line in tree.rs, as today
swift/Sources/BlocksUI/Kind/Rating.swift     struct RatingBlock: View { init(block: Rating) }
swift/Tests/BlocksTests/Render/RatingTests.swift
web/react/test/markup/rating.json            its extra markup cases, when it has any
just gen                                     writes the Swift switch, its name, role, variant and action, and both tables of child lists
```

No test states how many kinds there are. One that needs every kind asks the generated list:

```ts
for (const k of Object.keys(hooks)) ok(files.some((f) => f.split("-")[0] === k), `no fixtures/blocks file for ${k}`);
```

A new value of a style setting is one line in its enum and one arm beside it. TypeScript gets it from `just gen`:

```rust
impl TypeDesign {
    pub(crate) const fn css(self) -> &'static str {
        match self {
            Self::Default => ":root{font-family:system-ui,-apple-system,\"Segoe UI\",Roboto,sans-serif}",
            Self::Mono => "",
            Self::Serif => ":root{font-family:ui-serif,Georgia,Cambria,serif}",
        }
    }
}
```

A new bundle is one file; `npm run build` is `node build.mjs`:

```json
{ "entry": "src/play/index.ts", "minify": true, "uses": ["blocks"] }
```

A new Swift check is one file, `.gatekeeper/gates/swift-<check>.toml`, with its own `paths`. A new step of the
Swift harness is one file and one line of the `switch` the compiler asks for:

```swift
case .tap(let on): try run.tap(on)
```

A new app hook of `BlocksView` (say `onShare`) is a modifier in its own file, as `screenTitle` and `opened` are:

```swift
BlocksView(screen, source: source, act: send).onShare { share($0) }
```

`mount` and `adopt` draw a screen the same way, through one `host` (`shapes.md`), so a new piece of per-screen
state is a field of `Ctx` and nothing in either.

## Slices

This PR, slice 0: no file moves. The `arch.toml` lines for 13 files, the counts and lists of kinds replaced by a
walk over the generated list (5 test files), and the markup test's per-kind cases as
`web/react/test/markup/<kind>.json`. Slices queued `--refactor` then only move tests.

Then seven issues, which the orchestrator files on approve. Each adds its own `arch.toml` lines (`adr.md`, the
last section).

| | title | changes | proof | queue |
|---|---|---|---|---|
| 1 | `kinds: a kind's facts generated for Swift and for apply` | `Tree.swift`'s three tables and `Apply.swift`'s two leave for `just gen`; `core/apply.ts` reads `gen/hooks.ts` | `fixtures/trees/swift` and `fixtures/protocol` pass unchanged; the three differences in `adr.md` named in the PR | plain |
| 2 | `swift: the other 20 kinds, one file each` | `BlockRows`, `BlockFields`, `Components` and 10 more view files to `Kind/`, `Part/`, `Field/`; `BlockNode`'s `switch` generated | `swift test` and `blocks-snap --check` pass, tests untouched | `--refactor`, after 1 |
| 3 | `swift: the harness by step, render tests by kind` | `Snapshot.swift` to a `Run` and `Step/`; `RenderTests.swift` to `Render/` | the same test names pass; `fixtures/trees/swift` unchanged | `--refactor` |
| 4 | `ci: the Swift checks as gatekeeper gates` | `swift.yml`'s five steps to five gate files on a macOS leg | the leg runs the five gates and is green on the PR; `swift.yml` is gone | plain |
| 5 | `web: the shell as a folder` | `shell.ts` to `web/src/shell/`; `host` | `web/test/shell.test.ts` and `adopt.test.ts` untouched and green; `web/dist/types` exports the same names | `--refactor` |
| 6 | `web: one file per bundle` | `web/bundle/*.json`, `web/build.mjs` | `just gen` leaves `web/dist` byte for byte as it is (run here, `adr.md`) | `--refactor` |
| 7 | `theme: a style value's CSS written once` | `css()` beside each enum; `theme/css.rs`; `look.ts` reads `gen/schemes.ts`; `theme.rs` by area | `just gen` leaves `fixtures/css` unchanged | plain |

Open PRs on these files today: #304 (`.drover/rules.md`) and #314 (`markup.test.ts`). Whichever of each pair
merges second takes one update round. Lines: `src/` net about +150 (file headers, `host`, the generator's new
writers); the cap has 22,820 lines of headroom.
