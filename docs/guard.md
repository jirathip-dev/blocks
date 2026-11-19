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
- `kinds`: the app's own kinds, as `Built::check` takes them.

Write each screen as `<screen>.<seed>.json` from the app's own builders over fixed data, and fail a test when a file
is not what the builder writes today; then a changed builder is a changed file. On the adopting PR, run
`blocks check --tighten` once: it records every error the app has today.

## The commands

| Command | Does |
|---|---|
| `blocks check` | every fixture; exit 1 on an error no ignore or baseline covers |
| `blocks check --base origin/staging` | only the fixtures the branch changed (the fixture, its ignore or its baseline, committed or not); baselines held against the merge base |
| `blocks check --all --base <ref>` | every fixture, still held against base |
| `blocks check --tighten` | rewrite `.blocks/baseline/`: drop what is fixed, then judge again |
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
| `guard/baseline-stale` | a baseline entry is no longer found | `blocks check --tighten` |
| `guard/unused-ignore` | an ignore matches no finding | delete the ignore |
| `guard/baseline-grew` | with `--base`, a baseline gained an entry whose rule is not newer than base's file | fix the finding, or add an ignore with a reason |

A fixture new on the branch has no base baseline, so it may record nothing: a new screen starts clean. A base with no
`.blocks/guard.json` is adopting, and its first baselines are taken as written. When a pin move brings a rule newer
than a fixture's baseline, `--tighten` may record that rule's findings once.

## In CI

```yaml
- name: "blocks check: the lint and the ratchet on the changed screens"
  run: just blocks check --base "origin/${{ github.base_ref }}" --format sarif --out guard.sarif
```

This repo checks itself: `.blocks/guard.json` points at `fixtures/screens/` and `fixtures/guard/ok/`, `just guard`
runs in `just check`, and the `ci` job runs it with `BASE=HEAD^1` on a pull request.

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
