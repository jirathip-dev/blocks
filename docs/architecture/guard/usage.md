# guard: how the callers read (#79)

Sketches, not code to copy. The names are the ones `shapes.md` and `boundaries.md` use.

## An app sets it up, once

The command is the crate `blocks-cli` at the app's blocks pin, run through a bin of three lines in the app's own
workspace. No install, no release download: it builds with the app's cache and moves with the pin.

```toml
blocks     = { git = "https://github.com/jirathip-dev/blocks", rev = "<40 hex>" }
blocks-cli = { git = "https://github.com/jirathip-dev/blocks", rev = "<the same 40 hex>" }    # tools/blocks/Cargo.toml
```
```rust
fn main() -> std::process::ExitCode { blocks_cli::main() }                    // tools/blocks/src/main.rs, the whole file
```
```just
blocks *args:
    cargo run -q --locked -p blocks-tool -- {{args}}
```

`.blocks/guard.json` says where the screens are and how to draw them (`shapes.md` has every key):

```json
{
  "screens": ["fixtures/screens"],
  "kinds": ["herd"],
  "css": ["web/src/app.css"],
  "scripts": ["web/dist/app-blocks.js"],
  "harness": [["node", "--no-warnings", "node_modules/@jirathip-dev/blocks/web/shot/cli.ts"]],
  "inputs": ["package-lock.json"]
}
```

## An app writes its screens as seeded fixtures

A screen is data, so the guard reads data: one JSON file per screen and seed, written by the app's own builders from
fixed data. The app's test fails when a file is not what the builder writes today, so a changed builder is a changed
file, and "changed files" means something.

```rust
#[test]
fn screen_fixtures_are_fresh() {                               // the app's; `UPDATE=1` rewrites them
    for (name, screen) in [
        ("queue.empty", queue(&Data::empty())),                // no rows: the empty state must be there
        ("queue.one", queue(&Data::one())),
        ("queue.long", queue(&Data::long())),                  // the longest titles and labels the data allows
    ] {
        let text = serde_json::to_string_pretty(Built::of(&screen).value()).unwrap() + "\n";
        assert_eq!(std::fs::read_to_string(format!("fixtures/screens/{name}.json")).unwrap(), text, "{name}");
    }
}
```

The file name is `<screen>.<seed>.json`. `empty` and `long` are the two seed names the guard knows: a screen with a
list and no `empty` fixture, or no `long` one, gets the warning `guard/seed-missing`. A TS app writes the same files
from a node test.

## The commands

```sh
just blocks check                                   # every screen, static only; prints findings, exit 1 on a new error
just blocks check --base origin/staging             # only the fixtures the branch changed; baselines held against base
just blocks check --base origin/staging --render    # the same, and each changed screen drawn at 390
just blocks check --shot queue.long                 # shots/390/queue.long.png and shots/1440/queue.long.png; no server, no verdict
just blocks check --tighten                         # rewrite .blocks/baseline/: drop what is fixed
just blocks check --all --render --explore --seed 20261119 --minutes 10 --out guard-out      # the nightly sweep
just blocks check --replay guard-out/explore/queue.long/7.steps.json                         # one failing walk again
just blocks check --base origin/staging --format sarif --out guard.sarif                     # or --format json
just blocks skill --to <dir>                        # the usage skill of this pin, with the app's own examples
```

## A finding

```
fixtures/screens/queue.long.json
  error  lint/title-long     screen#queue/list#rows/row#12
         the title is 74 characters; the limit is 60
         fix: Shorten it to 60 characters or fewer; move the detail to `subtitle` or to a `text` block.
  error  render/tap-target   screen#queue/card#ask/button#later
         the button is 36 by 28 px; the smallest tap target is 44 by 44
         fix: Give the control at least 44 px each way: use the kind's own button, or drop the app rule that shrinks it.
3 screens checked: 2 new errors, 4 known, 1 ignored, 1 warning. FAIL
```

A finding names its rule, the fixture, the block by its ids, what was measured and what to change. The same finding
in JSON is a `Finding` (`shapes.md`); `--format json` writes one `Outcome`.

## In a test, with no command

The static rules are a function of the crate, so an app can hold one screen clean where it is built:

```rust
use blocks::guard;

#[test]
fn the_queue_is_clean_with_long_data() {
    let built = Built::of(&queue(&Data::long()));
    assert_eq!(guard::lint(&built, &["herd"]), []);            // Vec<Seen>: the rule, the block, what was measured
}
```

## An ignore, with its reason

`.blocks/ignore/queue.long.json`, written by hand, reviewed like code:

```json
[{ "rule": "lint/title-long", "at": "screen#queue/list#rows/*",
   "reason": "an issue title is the user's own text; the row wraps to two lines" }]
```

An ignore without a reason does not load (exit 2). One that matches nothing is the error `guard/unused-ignore`.

## The baseline

`.blocks/baseline/queue.long.json`, written only by `--tighten`:

```json
{ "guard": 1, "known": [{ "rule": "render/tap-target", "at": "screen#queue/card#ask/button#later" }] }
```

On the PR that adopts the guard, `--tighten` writes every finding the app has today. After that an entry can only
leave. A new screen starts with no baseline, so it starts clean. When a pin move brings a new rule, `--tighten` may
add that rule's findings once; nothing else may grow (`boundaries.md`, chart 1).

## CI in an app

```yaml
# in the app's existing Rust job: every PR, seconds
- name: "blocks check: static lint and the ratchet on changed screens"
  run: just blocks check --base "origin/${{ github.base_ref }}" --format sarif --out guard.sarif
```
```yaml
# .github/workflows/guard.yml: its own file
on:
  pull_request:
    paths: ["fixtures/screens/**", ".blocks/**", "web/src/**", "package-lock.json"]     # the app's UI paths
  schedule: [{ cron: "23 3 * * *" }]
jobs:
  render:                       # UI PRs only: the changed screens at 390; every screen when CSS, scripts or the lock moved
    if: github.event_name == 'pull_request'
    steps: [ …, { run: just blocks check --base "origin/${{ github.base_ref }}" --render } ]
  sweep:                        # nightly: every screen, static and at 390, then seeded walks for ten minutes
    if: github.event_name == 'schedule'
    steps: [ …, { run: just blocks check --all --render --explore --seed "$(( $(date +%s) / 86400 ))" --minutes 10 --out guard-out },
             { uses: actions/upload-artifact@v4, if: failure(), with: { path: guard-out } } ]
```

## Explore: a failing walk, replayed

The nightly run walks each screen from a seed, and a failure comes back as the shortest steps that still fail:

```
explore fixtures/screens/signup.one.json seed 20261119 walk 7: 31 steps, shrunk to 2
  error  render/overflow   screen#signup/form#join
         the block is 412 px wide in a 390 px screen
         fix: Let the block wrap: remove the fixed width or the unbroken text that holds it open.
  replay: blocks check --replay guard-out/explore/signup.one/7.steps.json
```
```json
[{ "type": { "id": "join", "text": "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW" } }, { "shot": { "name": "step-1" } }]
```

`steps.json` is the existing `Step` list (`tree.rs`), answers included, so a replay needs no answerer and the same
file runs under `blocks-shot --script`. An app that wants its real actions walked names an answerer in `guard.json`:
a command that reads an `Action` per line and writes an `Answer` per line from seeded data (`shapes.md`). With none,
actions are answered with nothing and only local behaviour is walked.

## The skill

`skill/blocks/` in this repo is generated by `just gen`: the kinds from the schema, the rule list from the rule
table, the examples from fixtures that pass with no finding. An app's lanes get it from the command, so it always
matches the pin and adds the app's own passing screens as examples:

```sh
just blocks skill --to "$LANE_SKILLS/blocks"         # SKILL.md, kinds/<kind>.md, rules.md, examples/<fixture>.md
```
```json
"examples": ["queue.one", "thread.long"]            // in guard.json: each must have no finding, or `skill` exits 1
```

## A new core kind, in this repo

```sh
cargo run -q -p blocks-cli -- new kind gauge
```
```
crates/blocks/src/kind/core/gauge.rs        the fields and a typed sample
crates/blocks/src/site/core/gauge.rs        the static writer
web/src/render/gauge.ts                     the HTML renderer
web/src/css/gauge.css                       its rules, in `@layer blocks`
swift/Sources/BlocksUI/Kinds/Gauge.swift    the SwiftUI view
```

Then `just gen` writes the lists that name every kind. No shared file is edited by hand, so two PRs that each add a
kind do not conflict.

## This repo checks itself

`.blocks/guard.json` here points at `fixtures/screens/` and `fixtures/guard/ok/`; `just guard` is `blocks check
--base`, part of `just check` and a step of the `ci` job. The baseline for the 26 golden screens is committed, so the
first rules land without a red tree, and it shrinks as the renderers are fixed.
