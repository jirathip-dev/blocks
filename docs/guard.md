# The guard: `blocks check`

`blocks check` lints an app's screens from its seeded fixture files and fails only on new errors in the fixtures a
branch changed, against a baseline per fixture that can only shrink. Every finding names its rule, the block by its
ids, what was measured and the fix. The design is `docs/architecture/guard/` (#79); this page is how to use it.

## Set it up in an app

The command is the crate `blocks-cli` at the app's blocks pin, run through a three-line bin in the app's workspace:

```toml
blocks-cli = { git = "https://github.com/jirathip-dev/blocks", rev = "<the blocks pin>" }    # tools/blocks/Cargo.toml
```
```rust
fn main() -> std::process::ExitCode { blocks_cli::main() }                                  // tools/blocks/src/main.rs
```

Then `.blocks/guard.json`, by hand. Unknown keys are refused (exit 2), so a typo never becomes a silent default:

```json
{ "screens": ["fixtures/screens"], "kinds": ["herd"] }
```

- `screens`: folders, not searched below. Each `*.json` whose root is a `screen` or a `sheet` is a fixture; any other
  file is listed in `skipped`. A fixture is named by its file name without `.json`, so two folders may not share one.
- `kinds`: the app's own kinds, as `Built::check` takes them, and the kinds a harness expects drawn natively.
- `css`: the app's stylesheets, loaded after `blocks.css`; the `css/` rules read them.
- `scripts`: run in the harness page before the screen is drawn: define island elements, set
  `window.blocksApps.<kind>` to an app kind's renderer.
- `harness`: each a command that takes `--plan <file>`, such as
  `["node", "--no-warnings", "node_modules/@jirathip-dev/blocks/web/shot/cli.ts"]`; with none, `--render` and `--shot`
  are refused.
- `inputs`: files or folders whose change, like one in `css` or `scripts`, has `--render` in a PR draw every fixture.
- `answer`: explore's answerer, a command run once per walk: it reads `{ "screen", "seed" }` then one `Action` per
  line and writes one `Answer` (or `{ "error": "why" }`) per line, a function of that first line and the actions so
  far. With none, each action is answered with nothing and `explore/unanswered` is skipped.
- `examples`: fixture names `blocks skill` adds to the usage skill as examples; each must have no finding.

Write each screen as `<screen>.<seed>.json` from the app's own builders over fixed data, and fail a test when a file
is not what the builder writes today; then a changed builder is a changed file. On the adopting PR, run
`blocks check --tighten` once: it records every error the app has today.

## The commands

| Command | Does |
|---|---|
| `blocks check` | every fixture; exit 1 on an error no ignore or baseline covers |
| `blocks check --base origin/staging` | only the fixtures the branch changed (the fixture, its ignore or its baseline, committed or not); baselines held against the merge base |
| `blocks check --all --base <ref>` | every fixture, still held against base |
| `blocks check --render` | also draw each fixture in scope at 390x844 in one harness run and judge what its probes saw (`render/`, `css/`) |
| `blocks check --explore [--seed <n>] [--minutes <n>]` | also walk each fixture from the seed: up to 30 taps on a button or a `tap`, or texts typed into a form, each action asked of `answer`; a failing walk is shrunk to its shortest steps on the model (40 tries) and written as `shots/explore/<fixture>/<walk>.steps.json`. `--minutes` starts new rounds of walks until it is spent, never cutting one; with `--render` each walk is replayed in the harness, probed after each step and its sent actions held to the screen's (`explore/sent-differs`) |
| `blocks check --replay <steps.json> [--render]` | that fixture's steps again, with their recorded answers and no answerer; exit 1 when they still fail |
| `blocks check --tighten` | rewrite `.blocks/baseline/`: drop what is fixed, then judge again; with `--render` the drawn rules too |
| `blocks check --shot <fixture>` | draw it at 390 and 1440 into `shots/<width>/<fixture>/`, with no probe and no verdict; repeatable |
| `blocks skill --to <dir>` | write the usage skill of this pin (`skill/blocks/` in the blocks repo) into `<dir>`, plus a page per `examples` fixture; exit 1 when one has a finding |
| `--format text\|json\|sarif`, `--out <file>` | the report: text (default), one `Outcome` as JSON, or SARIF 2.1.0; to stdout unless `--out` |

Exit 0 clean, 1 a new error, 2 a broken setup (no config, a file that does not parse, an unknown flag, an ignore
with no reason).

## The files

```
.blocks/guard.json               the config, by hand
.blocks/ignore/<fixture>.json    [{ "rule", "at", "reason" }], by hand; `at` exact or a prefix ending in "/*"
.blocks/baseline/<fixture>.json  { "guard", "known": [{ "rule", "at" }] }, written only by --tighten
```

## The ratchet

In scope, each error is ignored, known or new; a warning is printed and never fails. These fail too:

| Rule | When | Fix |
|---|---|---|
| `guard/baseline-stale` | a baseline entry is no longer found | `blocks check --explore [--seed <n>] [--minutes <n>]` | also walk each fixture from the seed: up to 30 taps on a button or a `tap`, or texts typed into a form, each action asked of `answer`; a failing walk is shrunk to its shortest steps on the model (40 tries) and written as `shots/explore/<fixture>/<walk>.steps.json`. `--minutes` starts new rounds of walks until it is spent, never cutting one; with `--render` each walk is replayed in the harness, probed after each step and its sent actions held to the screen's (`explore/sent-differs`) |
| `blocks check --replay <steps.json> [--render]` | that fixture's steps again, with their recorded answers and no answerer; exit 1 when they still fail |
| `blocks check --tighten` |
| `guard/unused-ignore` | an ignore matches no finding | delete the ignore |
| `guard/baseline-grew` | with `--base`, a baseline gained an entry whose rule is not newer than base's file | fix the finding, or add an ignore with a reason |

A `render/` or `css/` entry or ignore goes stale only in a run with `--render`, and a tighten without it keeps them.
A stylesheet's finding is not baselined: it is new until the rule is fixed. A fixture new on the branch has no base
baseline, so it may record nothing: a new screen starts clean; one on base with no baseline there was clean at the
newest `guard` base's baselines record. A base with no
`.blocks/guard.json` is adopting, and its first baselines are taken as written. When a pin move brings a rule newer
than a fixture's baseline, `--tighten` may record that rule's findings once.

## In CI

```yaml
- name: "blocks check: the lint and the ratchet on the changed screens"
  run: just blocks check --base "origin/${{ github.base_ref }}" --format sarif --out guard.sarif
```

This repo checks itself: `.blocks/guard.json` points at `fixtures/screens/` and `fixtures/guard/ok/`, `just guard`
runs in `just check`, and the `ci` job runs it with `BASE=HEAD^1` on a pull request. `guard.yml` sweeps every fixture
with `--all --render` each night on macOS, the WebKit the committed baselines were drawn in, then walks them with
`--explore` for ten minutes from the day number as the seed; a failure uploads `shots/` with its `steps.json`.

## Catalogs

A host that draws a screen it did not write, such as a model's reply, holds it to a catalog: a JSON file in the
host's repo naming the kinds allowed, the fields and actions per kind, a form's field types, the starts a link or a
loaded file may have, and the most blocks. `Catalog::read` refuses an unknown key, kind or field, a field no catalog
offers (`id`, `fallback`, `show`, `enabled`, `checks`, `set`), inputs on a kind that is no form, and a start that does
not end in `/` or `:`. `guard::lint_in(screen, catalog)` is `lint` plus these rules, on every block under the root;
with no catalog they see nothing.

| Rule | Fires on |
|---|---|
| `catalog/kind` | a block of a kind the catalog does not name |
| `catalog/field` | a field outside its kind's `fields`, a never-offered one, a tap's `focus` or `keep`, or a `{"get": key}` |
| `catalog/action` | an `action` anywhere in a block that its kind's entry does not list |
| `catalog/input` | a form field whose type the entry's `inputs` does not list |
| `catalog/link` | a `url`, `href` or `link` that starts with no `links` entry, or holds a space, a control or a backslash |
| `catalog/media` | a `src`, `avatar` or `poster` that starts with no `media` entry, or holds the same |
| `catalog/open` | a tap with `open`, `sheet` or `thread` |
| `catalog/size` | more blocks than `max.blocks` |

The bad fixtures are `fixtures/guard/bad/catalog/`, judged under `fixtures/guard/bad/catalog.json`.

## The harness

`blocks-shot --plan <file>` draws every run of a `Plan` in one WebKit launch, writes `<out>/<run>/<shot>.png`,
`.tree.json` and `report.json`, and every `Seen` in `<out>/seen.json`; it exits 0 when it drew every run, 2 when it
could not. `report.json`'s `sent` is held to the actions the walk declared, so both harnesses are checked the same way;
`render/console` is a console error or an uncaught exception in the page. A probe is one file in `web/shot/probe/`, named for its rule, found by reading the folder; each has a bad
fixture in `fixtures/guard/bad/render/` (a screen and its CSS) or `fixtures/guard/bad/css/`. `--check` draws one
screen and prints the `Seen`s of the rules it has always held (`render/tree` against `--expect`, `no-size`,
`overflow`, `overlap`, `no-name`) as lines.

`blocks-snap --plan <file>` takes the same plan in SwiftUI and reports the four tree rules it can measure (`no-name`,
`no-size`, `overflow`, `overlap`); a plan's `css` and `scripts` are web only. An app with its own kinds, styles or look
calls `Snapshot.plan(plan) { run, screen, size in … }` from `BlocksSnapshot` in its own bin and lists that bin in
`harness`. Run it nightly first and move it onto UI-path PRs once its real time is known.

## A raw-UI ban, to copy

The guard sees only what is drawn from blocks. An app keeps hand-built UI out with its own `.drover/arch.toml` ban,
leaving its app blocks and islands as the one way out:

```toml
[[ban]]
pattern = "document.createElement"
paths = ["web/src/**"]
except = ["web/src/islands/**", "web/src/kinds/**"]
reason = "a screen is blocks: draw it through a kind, an app block or an island"
```
