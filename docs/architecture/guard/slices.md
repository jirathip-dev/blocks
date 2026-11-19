# guard: the issues to file, in order (#79)

The orchestrator files each with a link to this folder. Each slice leaves the tree green and is useful alone: after G3
an app can adopt the static ratchet; G4 adds the render; the rest is independent of the apps' adoption.

## blocks

| # | Ships | Gate | Needs |
|---|---|---|---|
| **G1** the codegen folder (`--refactor`) | `codegen.rs` (902 of 1,000 lines) becomes `codegen/`: `mod.rs`, `schema.rs`, `ts.rs`, `swift.rs`, `fixtures.rs`. Nothing else changes | `just gen` writes the same bytes; arch-check | |
| **G2** the lint | `guard/shape.rs` (`Rule`, `Severity`, `Seen`, `Finding`); `guard/rules/<name>.rs` for the 16 `lint/` rules and the table rows of the others; the collector in codegen that writes `guard/rules/mod.rs`; `guard::lint`, `guard::finding`; `fixtures/guard/bad/<rule>.json` and `fixtures/guard/ok/*.json`; the shapes in the schema, TS and Swift; the rules line | the table test: every rule has a `what`, a `fix`, a unique id and a bad fixture that fires only it; no ok fixture fires; lint of the 42 goldens under 50 ms in `perf.rs` | G1 |
| **G3** `blocks check` and the ratchet | `crates/blocks-cli` (`blocks check`, `--base`, `--all`, `--tighten`, `--format text\|json\|sarif`, `--out`); `Config`, `Ignore`, `Baseline`, `Outcome`; `guard::judge`, `tighten`, `sarif`; this repo's `.blocks/` over `fixtures/screens` and `fixtures/guard/ok`, with its first baseline; `just guard` in `just check` and a step in `ci`; `docs/guard.md`; the `blocks` line in `docs/deps.md`; the rules line | in a temp git repo: a new error in a changed fixture exits 1 and in an unchanged one exits 0; a grown baseline, a stale entry and an unused ignore each exit 1; an ignore with no reason exits 2; the SARIF validates against the 2.1.0 schema (a fixture) | G2 |
| **G4** render at 390 | `blocks-shot --plan`; `web/shot/probe/<rule>.ts` for the `render/` and `css/` rules, with today's `fit` moved into them; `seen.json`; `scripts` in the page; `check --render` and `check --shot`; `guard.yml` here (nightly sweep) | a bad fixture per probe fires only it in WebKit; every `fixtures/blocks` file still passes `--check`; the 27 fixtures draw in one launch; `--shot` writes both sizes | G3 |
| **G5** the skill | `codegen/skill.rs` writes `skill/blocks/` from the schema, the rule table and `fixtures/guard/ok`; `blocks skill --to`, with the app's `examples`; the rules line; README.md's one-line agent prompt (q2270) | arch-check on `skill/`; codegen fails on an example with a finding; `skill --to` on this repo equals `skill/blocks/` plus its examples | G3 |
| **G6** SwiftUI | `blocks-snap --plan`, the four tree rules as `Seen`, a public plan runner in `BlocksSnapshot` for an app's own bin | on every `fixtures/blocks` file `seen.json` is empty, and equal to `blocks-shot`'s for the four rules on the bad fixtures | G4 |
| **G7** explore | `guard/explore.rs` (declared steps, the walk, the shrinker); the answerer protocol; `check --explore`, `--seed`, `--minutes`, `--replay`; the `explore/` rules; `render/console` and the sent-actions compare in both harnesses; the nightly job here | fixed seeds in `just test`: a seeded bad fixture is found and shrunk to its known shortest steps; a replay of the written `steps.json` fails the same way; the same seed gives the same walk | G4 |
| **G8** the kind folders (`--refactor`) | each kind's struct and sample in `kind/core/<kind>.rs`, its static writer in `site/core/<kind>.rs`, its CSS in `web/src/css/<kind>.css`; `just gen` writes the lists (`kind/core/mod.rs`, `site/core/mod.rs`, `web/src/gen/renderers.ts`, `BlocksUI/Gen/Kinds.swift`) and the build joins the CSS; the skill's kind pages gain the sample's Rust source | the schema, `web/dist` and every fixture are byte-identical before and after | G1 |
| **G9** `blocks new kind` | five templates and the command | in a temp copy of the repo: `new kind gauge`, then `just gen`, then the build, tsc and `swift build` pass with no hand edit | G8 |

## The line budget

Counted as `scripts/line-cap.sh` counts: non-test Rust in `crates/*/src`, TS in `web/src` and `web/shot`, Swift in
`swift/Sources`. Estimates, good to about one part in five; templates, fixtures, the skill and workflows are not
counted.

| Slice | Rust | TS | Swift | The kit so far |
|---|---|---|---|---|
| G1 | 0 | | | 0 |
| G2: shapes 90, the walk the rules share 90, 16 rules at about 18, the other rows 60, the collector 40 | 520 | | | 520 |
| G3: judge and tighten 120, SARIF 90, the command 310 (flags 80, files 90, git 40, printing 60, main 40) | 520 | | | 1,040 |
| G4: the plan 70, eight probes 200, CSS rules 60, less `fit` 30; the command's render pass 110 | 110 | 300 | | 1,450 |
| G5: the skill generator 180, `skill --to` 40 | 220 | | | 1,670 |
| G6 | | | 80 | 1,750 |
| G7: declared steps 80, the walk 95, the shrinker 70, the rules 45; the command 80; the harness 30 | 370 | 30 | | 2,150 |
| G8: three collectors 120; the moved code is the same lines | 120 | | | 2,270 |
| G9 | 90 | | | 2,360 |

Against `ci/cap.toml`, measured at `ede5416` on 2026-11-19:

- The cap is 15,000 (`ci/cap.d/2026-11-19-15000.toml`); the tree counts 14,154, so 846 lines are free.
- `drover cap blocks` projects 15,991 with the open PRs, before this kit and before the nine queued issues with no PR.
- G1 fits today. G2 alone (520) fits only if nothing else merges first. The whole kit needs about 18,500 with
  today's queue (15,991 + 2,360, plus margin). Decided (q2269): one raise to 19,000, filed by the orchestrator,
  before G2.
- Queue order: G1 to G7, then G8 and G9 last (q2269).

## The apps, after G3

Filed in each app's fleet by its orchestrator, each blocked on the blocks issue it names
(`drover queue <fleet> block --on blocks#N <issue>`), each starting with the pin move.

| Where | Does | Blocked on |
|---|---|---|
| drover | the hook before `turn done` and `blocks skill --to` at spawn, as `hook.md` | G3; G5 for the skill |
| drover | adopt: the tool bin, `.blocks/guard.json`, its screens as seeded fixtures (its goldens today, by seed), `--tighten`, the static CI step, `guard.yml`, its raw-UI ban; later an answerer | G3; G4 for `guard.yml`; G7 for the answerer |
| cooee | adopt: the same, static first; its own bin over `BlocksSnapshot`'s plan runner for the render (open question 2) | G3; G6 |
| synergy | adopt: the same, with its fixtures written by a node test | G3; G4 |
