Closes #143

Raises the blocks line cap from 19,000 to 23,000 (owner decision q2289: approve #45's desktop renderer ADR and raise once for its ~3,580 lines over six slices).

- New `ci/cap.d/2026-11-19-23000.toml` with `line_cap = 23000`; the commit carries `Cap: 19000 → 23000 (#143, q2289)`.
- No other file in `ci/cap.d` or `ci/cap.toml` changes.
- `scripts/line-cap.sh` already counts `crates/*/src`, so the desktop renderer's two new crates are counted with no script change.

src/ net +0 (budget +0): config-only change.

## Evidence (head d8630f77e175a93f90d74fa1b6cb19a4e89d595c)

`just` is not installed on this host, so the `just cap` recipe's four commands were run directly:

- `sh scripts/line-cap.sh` → exit 0, `non-test lines: 17971 / cap 23000`
- `sh scripts/line-cap.test.sh` → exit 0, `line-cap tests pass`
- `sh scripts/for-apps.test.sh` → exit 0, `for-apps tests pass`
- `test "$(wc -l < .drover/rules.md)" -le 30` → exit 0

## For humans

The repo's code-size limit goes from 19,000 to 23,000 lines, as the owner decided, so the approved desktop renderer work fits without each change asking again.
