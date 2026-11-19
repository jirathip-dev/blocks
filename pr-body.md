Closes #79

The guard kit ADR in `docs/architecture/guard/`: screen lint, `blocks check`, the ratchet, the explore mode, the velocity kit, the drover hook contract and the generated usage skill. It covers rule list v1 with ids, severities and fix text, the data shapes, the CLI's usage, the CI cost per PR, and the slices G1 to G9 with line budgets.

The second commit records the owner's answers to the open questions (q2269): one cap raise to 19,000 before G2, cooee's SwiftUI render nightly first, G8 and G9 queued last, and `render/no-name` in the rule list once #91 lands. The README agent prompt (q2270) lands in G5.

Decided: this PR adds no `.drover/arch.toml` lines. Every line the ADR lists belongs to a slice (G1 to G8) and names paths those slices create, so each lands in its own slice's PR.

src/ net +0 (budget: docs only).

## For humans

This adds the approved design for checking app screens: lint rules, one check command, and a baseline that only shrinks. It also lists the follow-up work items in order. No app or library behaviour changes yet.

## Evidence at f4cc05ad1e91fbc7018f5f7b42a3dba52e5179b2

- `bash scripts/line-cap.sh`: exit 0, 16091 / cap 17000.
- `drover arch-check --base origin/staging`: exit 1. The single violation is `just gen exited 127: just: command not found`, because `just` is not installed on the lane host. CI's arch-check runs `just gen`. No other violation was reported.
