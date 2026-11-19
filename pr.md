Closes #37

## For humans
The repo's agent-read docs now match the code: the layer list, which gates `just check` runs, what the web gate checks, which files codegen writes, how the web patcher batches draws, and where the line cap lives (now 15,000). The overview no longer calls the HTML renderer, shell, static site renderer and headless harnesses "still to come".

## Changes
- `.drover/rules.md`: layer chain rewritten from `.drover/arch.toml`'s `[[layer]]`s (built, behave, tree, site, theme, layout, web included)
- `README.md`: shipped list (amendment q2238); `just check` runs every gate but `just sim`, whose fixed seeds run in `just test`; `just web` covers all of `web/src` and the node tests; the cap is the highest `line_cap` across `ci/cap.toml` and `ci/cap.d/`, now 15,000
- `docs/schema.md`: adds `web/src/gen/schemes.ts` and `Gen/Schemes.swift`
- `docs/bench.md` Bursts: the patcher draws on the next animation frame (`requestAnimationFrame`, web/src/patch.ts:175); the 150 ms gap now reads as well over one frame. `bench/run.js` is left as is: the gap still keeps each update drawing on its own

src/ net +0 (budget n/a): docs only.

## Evidence at 65eedac7f808814ee2c50e6e64a6e1358eaa5a05
`just` is not installed on this host, so I ran the recipe bodies directly:
- `sh scripts/line-cap.sh`: exit 0 (13656 / 15000)
- `test "$(wc -l < .drover/rules.md)" -le 30`: exit 0
- `drover arch-check --base origin/staging`: exit 1. Its one violation is the generated-files step, which shells out to `just gen` (`just: command not found`). This PR changes no source or generated file, so CI's arch job is the real check.
