# guard: screen lint, `blocks check`, the ratchet and the agent kit (#79)

## Summary

Decision: all rules and verdicts live in the Rust crate. One new command lints an app's screens from seeded fixture
files, has the existing harnesses draw them at 390 and only measure, and fails only on new findings in changed files,
against a per-screen baseline that can only shrink. Every finding carries its fix.
Slices: nine in blocks (codegen folder, lint, command and ratchet, render at 390, skill, SwiftUI, explore, kind
folders, new-kind scaffold), then drover's hook and one adopting issue each in drover, cooee and synergy.
Decided (q2269): one cap raise to 19,000 before G2; cooee's SwiftUI render nightly first; kind folders queued last;
`render/no-name` joins the rules once #91 lands. README.md's agent prompt (q2270) lands with G5.

## Read in this order

| File | What |
|---|---|
| `usage.md` | how the callers read: an app's setup, the commands, a finding, an ignore, CI, explore, the skill, a new kind |
| `adr.md` | the question, the options, the decision in ten parts, rule list v1, the CI cost, consequences, open questions, the `.drover/arch.toml` and `.drover/rules.md` lines |
| `shapes.md` | the files in an app, the data shapes (finding, ignore, baseline, outcome, config, plan, seen), the answerer protocol, SARIF |
| `boundaries.md` | which module may call which and what enforces it; two statecharts (a finding through the ratchet, an explore walk) |
| `hook.md` | the contract for drover's `turn done` hook: what it runs, what comes back. The drover issue links this page |
| `slices.md` | the issues to file, in order, with line budgets against `ci/cap.toml` |

## Where each ask is answered

| Ask | ADR part | Detail |
|---|---|---|
| screen lint, ids, severities, ignore with a reason, unused ignores | 1, 2, 5 | `adr.md` rule list; `shapes.md` |
| `blocks check`, JSON and SARIF | 3, 4 | `usage.md`; `shapes.md` Outcome, SARIF |
| ratchet | 5 | `boundaries.md` chart 1; `shapes.md` Baseline |
| usage skill, generated (q2250) | 8 | `usage.md` The skill; slice G5 |
| drover hook contract | | `hook.md` |
| escape hatches: app CSS, islands, app blocks | 7 | `adr.md` part 7 |
| explore mode (q2207) | 6 | `boundaries.md` chart 2; `shapes.md` the answerer; slice G7 |
| velocity kit (q2207): `new kind`, `--shot`, seeded fixtures, examples from fixtures | 3, 8, 9 | `usage.md`; slices G4, G5, G8, G9 |
| a fix on every finding (q2250) | 2 | `shapes.md` Finding, Seen; slice G2's table test |
| CI cost per PR | | `adr.md` CI cost |

## The kit in one picture

```
an app (drover, cooee, synergy)                                        blocks, at the app's pin
  its builders ──fixture writer──> fixtures/screens/<screen>.<seed>.json
  .blocks/guard.json   ignore/<fixture>.json   baseline/<fixture>.json
        │
        ▼
  blocks check ── crates/blocks-cli: files, git, processes, the clock; no rule of its own
        │   ├─ static ──> blocks::guard::lint        the rule table, one file per rule, each with its fix
        │   ├─ render ──> blocks-shot --plan / blocks-snap --plan     draw at 390, measure, write seen.json
        │   ├─ explore ─> blocks::guard::explore     the walk on the model, replayed by the harness, shrunk
        │   └─ judge ───> blocks::guard::judge       ignores, baseline, changed files ──> Outcome
        ▼
  text │ JSON │ SARIF        exit 0 clean · 1 a new error · 2 broken setup
```

## What was read and measured

- blocks `staging` at `ede5416`: `built.rs`, `tree.rs`, `kind/`, `codegen.rs`, `web/shot/`, `web/src/{tree,dump,gate}.ts`,
  `web/lint.mjs`, `blocks-snap`, the workflows, `.drover/arch.toml`, `scripts/line-cap.sh`, `docs/architecture/blocks/`.
- The 42 goldens in `fixtures/screens/`: 26 are screens. Their largest values set the limits in the rule list: 9 blocks
  in one level, depth 5, 7 actions, a 51-character title, a 27-character label, 2 primary buttons (in two cards).
- CI, the last 30 green runs of each workflow on 2026-11-19: `ci` median 161 s, `web` 102 s, `swift` 92 s.
- The cap on 2026-11-19: 14,154 of 15,000 counted lines; with the open PRs `drover cap blocks` projects 15,991.
- Hot files, merged PRs in 14 days: `codegen.rs` 15, `blocks.css` 13, `render/index.ts` 12, `site/mod.rs` 11,
  `shot.ts` 8, `BlocksUI/Blocks.swift` 8. Parts 9 and 10 of the ADR turn those this kit touches into folders.
- pbakaus/impeccable and antithesishq/bombadil were not read as code: only the ideas the issue names are used.
