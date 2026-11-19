Closes #113

Slice 0 of the approved hotspots ADR (`docs/architecture/hotspots-2026-11-16/`), with amendment q2278 applied.

- `.drover/arch.toml`: `shared` adds `crates/blocks/tests/sim.rs`, `web/src/patch.ts`, `web/test/patch.test.ts`, `web/test/dom.ts`, `web/shot/shot.ts`, `.drover/arch.toml`, `justfile`, `README.md`; `[[collect]] docs/*.md`; size limits: the four web files 200, `sim.rs` 520, `arch.toml` + `justfile` 300, `README.md` 70.
- Decided per q2278 (1): `README.md` is shared with a size limit, not frozen; it is 50 lines at staging (the React ADR added 4), so 70 leaves room for the approved additions (guard kit prompt, desktop renderer).
- ADR text (`adr.md` decision 8 + slice 0 block, folder README) updated to match q2278, so the ADR and the config agree.
- Merged `origin/staging` (73e8ea6, then f5017c7). The second merge conflicted in `.drover/arch.toml`: I kept both sides' `shared` entries and `[[size]]` blocks, so staging's `crates/blocks/src/codegen/mod.rs` entry (80 lines) sits next to slice 0's.
- Not done here: the drover issue from q2278 (3) (arch-check measuring every file a size rule names, Swift/.md/.drover included). Lanes can't file issues in other repos, so the orchestrator files it. Until then, the size rules for `README.md`, `justfile` and `arch.toml` are written but not measured, as the ADR says.

src/ net +0 (budget n/a): config and docs only.

## Evidence (head f661aa8ce9fb5d00d566a3c0e78b54b810cef2ec)

- `drover arch-check --config <copy of .drover/arch.toml with generate = "true"> --base origin/staging` → exit 0, `755 files, 0 violations`. `just` isn't installed on this host, so the generated-file step was stubbed out; this PR touches no generated file. CI runs the full `just arch`.
- The same with the 200-line limit lowered to 150 → exit 1, with violations for `shot.ts` (194), `patch.ts` (188) and `dom.ts` (186), so the new size rules are enforced (run at 7cde95e; the merge does not change those files).
- `DROVER=drover sh scripts/arch-size.test.sh` → exit 0.

## For humans

Eight files that kept making changes wait in line for each other are now marked as shared, each with its own size limit, so changes to them no longer queue one at a time.
The README can still grow a little (up to 70 lines); anything bigger goes in its own doc.
This is the first step of the approved plan; the file splits come in later changes.
