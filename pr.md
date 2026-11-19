Closes #46

## For humans
The plan to run the web client's logic as compiled WebAssembly is dropped: it would make the page script about fourteen times larger for no visible gain.
The measured sizes and the reasoning are recorded in the architecture notes, and the blocks package stays one package.

## What
- `docs/architecture/wasm-core/`: the approved ADR (no-go, q2240), measured sizes, the design a go would have built, the crate-split answer (q2193).
- `docs/architecture/blocks/migration.md`: L2 row marked no-go with the numbers and a link.
- ADR open question 1 recorded as answered (q2240: the follow-up is filed as its own issue).
- No code; no `.drover/arch.toml` lines (the ADR ends with none).

src/ net +0 (budget n/a): docs only, as the no-go ADR's one slice says.

## Evidence at da2eb2f3cf20ea10c3c9077c49db362c4eab276c
- `bash scripts/line-cap.sh`: exit 0 (13336 / 13500).
- `drover arch-check`: exit 1, its one violation is `just gen exited 127: just: command not found` (no `just` on this host); the change touches only markdown, so generated drift is unaffected. CI runs it with `just`.
