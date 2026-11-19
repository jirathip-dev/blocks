# guard: the data shapes (#79)

The shapes are Rust types in `crates/blocks/src/guard/shape.rs`. Those that cross a process (`Seen`, `Plan`,
`Finding`, `Outcome`) join the schema, so `just gen` writes them for TS and Swift like every other wire type.

## The files in an app

```
.blocks/
  guard.json                     Config: written by hand, once
  ignore/<fixture>.json          [Ignore]: written by hand, each with its reason
  baseline/<fixture>.json        Baseline: written only by `blocks check --tighten`
fixtures/screens/                wherever `screens` points
  <screen>.<seed>.json           one screen or sheet as `Built` writes it; the app's fixture writer keeps it fresh
```

`<fixture>` is the fixture's file name without `.json`. Per-fixture files are the hot-file rule applied: two PRs meet
in one of them only when both change that screen.

## A rule

```rust
pub enum Severity { Error, Warn }

pub struct Rule {
    pub id: &'static str,          // "<engine>/<name>": lint, render, css, explore, guard
    pub severity: Severity,
    pub since: u16,                // the guard::VERSION that added it, or last tightened its limit
    pub what: &'static str,        // "the title is over 60 characters"
    pub fix: &'static str,         // a full sentence: what to change
}

pub const VERSION: u16 = 1;        // moves with any new rule or tighter limit
pub fn rule(id: &str) -> Option<&'static Rule>;
pub static RULES: &[&Rule];        // from the generated guard/rules/mod.rs
```

A static rule's file also holds its check: `pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>)`, where `Cx` is one walk
of the screen that every rule shares (each block with its `at`, its depth, its parent, hidden or not in the start
state).

## What is seen, and a finding

```rust
/// What a rule or a probe measured. No severity, no fix: only the crate makes a Finding.
pub struct Seen {
    pub rule: String,              // a harness sending an id the table lacks is a broken setup: exit 2
    pub at: String,                // the block: "screen#queue/list#rows/row#12"; "" for the whole file
    pub detail: String,            // "74 characters", "36 by 28 px", "2.9:1"
    pub file: Option<String>,      // set by a harness for a css/ rule: the stylesheet
    pub line: Option<u32>,
    pub run: Option<String>,       // set by a harness: the plan's run, and the shot within it
    pub shot: Option<String>,
}

#[non_exhaustive]                 // built only by guard::finding
pub struct Finding {
    pub rule: String,
    pub severity: Severity,
    pub file: String,              // repo-relative: the fixture, or the stylesheet
    pub at: String,
    pub line: Option<u32>,         // css/: the declaration; a fixture: where the block's id is written, else 1
    pub message: String,           // the rule's `what` with the `detail`
    pub fix: String,               // required; the rule's `fix`
    pub steps: Option<String>,     // explore: the shrunk steps.json
}
```

`at` is built the way `tree::check` already names a node: `kind#id` per level, and for a block with no id
`kind~n`, the n-th such kind among its siblings. A finding is the same finding while `(rule, file, at)` is the same.

## An ignore and the baseline

```rust
pub struct Ignore {
    pub rule: String,
    pub at: String,                // exact, or a prefix ending in "/*"
    pub reason: Reason,            // a non-empty string: an empty one does not parse
}

pub struct Known { pub rule: String, pub at: String }

pub struct Baseline {
    pub guard: u16,                // guard::VERSION when the file was last written
    pub known: Vec<Known>,         // sorted; errors only
}
```

The rules for the baseline, all in `guard::judge`:

- An entry may leave at any time. `--tighten` writes `known` as today's findings that were already known, plus those
  of rules with `since` over the file's `guard`, then sets `guard` to `VERSION`.
- Against base, a file's new entry is legal only if its rule's `since` is over base's `guard` for that file. A
  fixture that is new on the branch has no base file, so it may record nothing. A repo whose base has no
  `.blocks/guard.json` is adopting: its first baselines are taken as written.

## The outcome

```rust
pub struct Outcome {
    pub guard: u16,
    pub pass: bool,                // no entry in `new`
    pub new: Vec<Finding>,         // errors in scope that nothing covers, and the guard/ errors
    pub warned: Vec<Finding>,
    pub known: Vec<Finding>,       // covered by a baseline
    pub ignored: Vec<Finding>,     // covered by an ignore
    pub checked: Vec<String>,      // the fixtures in scope
    pub skipped: Vec<String>,      // what was not judged, and why: "explore/unanswered: no answerer", "queue.json: not a screen"
}
```

`--format json` writes this. `--format sarif` writes SARIF 2.1.0 from it:

| SARIF | From |
|---|---|
| `tool.driver.name`, `.rules[]` | `blocks check`; each `Rule`: `id`, `shortDescription` = `what`, `help.text` = `fix`, `defaultConfiguration.level` |
| `results[].ruleId`, `.level` | `rule`; `error`, or `warning` |
| `results[].message.text` | `message`, then `Fix: ` and `fix` |
| `results[].locations[0]` | `file`, `line` |
| `results[].partialFingerprints["blocks/v1"]` | `rule`, `file` and `at` joined |
| `results[].baselineState` | `new` for `new` and `warned`, `unchanged` for `known`; an ignored finding gets a `suppressions` entry with the reason |

## The config

```rust
pub struct Config {
    pub screens: Vec<String>,          // folders; each *.json whose root is a `screen` or a `sheet` is a fixture
    pub kinds: Vec<String>,            // the app's own kinds, as `Built::check` takes them
    pub css: Vec<String>,              // app stylesheets: loaded after blocks.css, and read by the css/ rules
    pub scripts: Vec<String>,          // run in the harness page: define island elements, set window.blocksApps.<kind>
    pub harness: Vec<Vec<String>>,     // each a command that takes `--plan <file>`; none: --render is refused
    pub inputs: Vec<String>,           // a change in one of these, in `css` or in `scripts` re-renders every fixture
    pub answer: Option<Vec<String>>,   // explore's answerer
    pub examples: Vec<String>,         // fixtures `blocks skill` writes as examples; each must have no finding
}
```

Unknown keys are refused, so a typo is exit 2 and never a silent default.

## The plan: the command to a harness

```rust
pub struct Plan { pub out: String, pub runs: Vec<Run> }

pub struct Run {
    pub name: String,                  // the fixture, or `<fixture>/<walk>` for explore
    pub screen: String,                // the fixture's path
    pub size: String,                  // "390x844"; --shot adds "1440x900"
    pub css: Vec<String>,
    pub scripts: Vec<String>,
    pub kinds: Vec<String>,
    pub steps: Vec<Step>,              // tree.rs's Step; empty: one shot of the start state
    pub probes: bool,                  // false for --shot
}
```

A harness writes, as today, `<out>/<run>/<shot>.png`, `<shot>.tree.json` and `report.json`, and now one
`<out>/seen.json`: `Vec<Seen>`. It exits 0 when it drew every run, whatever it saw; 2 when it could not.

## The answerer: the command to an app, for explore

One process per walk, lines of JSON on its stdin and stdout:

```
→ { "screen": "fixtures/screens/queue.one.json", "seed": 20261119 }     the first line
→ Action                                                                 one per action the walk sends
← Answer   or   { "error": "why" }                                       one per Action
```

`Action` and `Answer` are the wire types. The answerer is the app's own code over seeded data: a pure function of the
first line and the actions so far. The command replays a walk to check that (`explore/unstable`).

## The static API

```rust
pub fn lint(screen: &Built, app: &[&str]) -> Vec<Seen>;                          // Built::check's faults and the lint/ rules
pub fn finding(seen: Seen, fixture: &str) -> Option<Finding>;                    // None: no such rule
pub fn judge(found: Vec<Finding>, held: &Held, scope: &Scope) -> Outcome;        // Held: ignores, baselines, base's baselines
pub fn tighten(old: Option<&Baseline>, found: &[Finding]) -> Baseline;
pub fn sarif(outcome: &Outcome) -> Sarif;

pub mod explore {
    pub fn walk(screen: &Built, seed: u64, budget: usize, answer: &mut dyn FnMut(&Action) -> Result<Answer, String>) -> Walk;
    pub fn shrink(steps: &[Step], fails: &mut dyn FnMut(&[Step]) -> bool, tries: usize) -> Vec<Step>;
}
pub struct Walk { pub steps: Vec<Step>, pub sent: Vec<Action>, pub seen: Vec<Seen> }
```

Nothing here opens a file, starts a process or reads a clock: the command hands in what it read and the closures
that reach the outside.
