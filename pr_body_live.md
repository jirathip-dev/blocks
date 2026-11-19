Closes #156

Slice 6 of the hotspots ADR (#113, q2278): `docs/schema.md` keeps its first paragraph and a table of links, and its sections move word for word to `docs/schema/generated.md`, `blocks.md`, `behaviours.md`, `stream.md` and `versioning.md`.

## For humans

The schema doc is now one short index page that links to five pages, one per subject.
The text itself is unchanged, so each subject can be edited without touching the others.

## What changed

- `docs/schema.md`: the title, the first paragraph ("The Rust types … are the one source.") and a table linking the five pages.
- `docs/schema/*.md`: each starts with a `#` title (the old `##` heading where one existed; "Generated files" and "Behaviours" for the two that had none), then the old lines unchanged. `blocks.md` holds the blocks paragraph and the `fixtures/screens/` paragraph, as `shapes.md`'s table says.
- `.drover/arch.toml`: the ADR's slice 6 lines: `docs/schema.md` appended to `frozen`, a `[[collect]]` for `docs/schema/*.md`, and `docs/schema/*.md` added to `[docs] paths`.
- No code, test or generated file changes. No link pointed at a `#section` anchor of the old file; the five places that name `docs/schema.md` still resolve to the index.

src/ net +0 (ADR estimate for this slice: 0; it is docs and config only).

## Evidence at a406f7b66e1148420930e1d34c27c9412628ee83

The head merges origin/staging twice into a643246: first #158 and #127, then #185 and #177 (#133), then #175 (#134). CI was green at the first merge, a056590. #133 and #134 edited paragraphs that this branch moved out of `docs/schema.md`, so its edits are applied word for word in `docs/schema/blocks.md` (the 29-kind list, the stepper fault, the `lines` paragraph) and `docs/schema/behaviours.md` (`mul`). The index keeps its table of links. The old body of staging's `docs/schema.md` minus its title and first paragraph, sorted with headings and blank lines removed, `diff` against the five pages: exit 0. The conflict in `.drover/arch.toml` was two new `[[collect]]` entries, staging's `docs` and this slice's `docs/schema`. Both are kept as separate entries. The diff against staging is still only `docs/schema*` and `.drover/arch.toml`.

- Perf: CI run 44492524073 at a643246 failed only at "perf in release" (10.85 ms against a 10 ms budget). Rerunning the failed job on the same head passed (`gh run watch --exit-status`: exit 0). No Rust changes in this PR. The same test also missed at 1b6bb72 (11.25 ms) and on staging's own run at bda7480 (10.52 ms; its green runs measured about 5.2–5.6 ms), so the runner's timing varies whatever the diff.
- Gen at a406f7b: `npm --prefix web ci`, then `blocks-codegen`, `npm --prefix web run build` and the two `BLOCKS_GEN=1` tests (the body of the `just gen` recipe; `just` is not installed here) exit 0, and `git status` shows no tracked change. `web/dist/blocks.js` and `blocks.css` match staging byte for byte.
- `cargo test -q --locked --workspace` at a406f7b: exit 0. The first run failed `site/tests/pages.rs:30` (34 pages, 33 expected) because a stale `kind-table.html` from an earlier build sat in the reused target directory. After removing that file, the test passes.
- `sh scripts/line-cap.sh`: exit 0 (16609 / 19000).
- `drover arch-check --base origin/staging`: its only violation is ``just gen` exited 127`` (no `just` on this host). CI runs the full check.

- Word for word: the old body lines, minus the `##` headings and blank lines, sorted, `diff` against the five new files' lines: exit 0.
- `drover arch-check --config <arch.toml minus generated/generate> --base origin/staging`: exit 0 (`747 files, 0 violations`). `just` is not installed on this host, so the `just gen` drift step was run by CI only. With no code change, every generated file (including `web/dist/blocks.js` and `blocks.css`) stays byte-identical.
- `cargo fmt --check`: exit 0.
- Not checked locally: the local drover build is not CI's pinned `build-staging-9ea69d9`, and with `--base` it did not report an added line in a frozen file. CI's arch-check decides whether the new `frozen` line enforces.

## Why (round 1)

Decided: docs/schema.md keeps its title, its first sentence and a table of links; the five sections move to docs/schema/ unchanged
Because: "`docs/schema.md` keeps its first paragraph and a table of links; its sections move to `docs/schema/`, word for word"
Decided: each new page opens with a # title, the old ## heading where there was one, else Generated files or Behaviours
Because: docs/schema/generated.md:1
Decided: the arch.toml lines are the ADR's slice 6: schema.md frozen, a docs/schema collect, docs/schema/*.md in docs paths
Because: "This slice's `.drover/arch.toml` lines are added as the ADR writes them"
Rejected: adding docs/schema/ to .drover/docs.md — the ADR does not list it; a deviation is an ask
Check: the five pages' lines, minus headings and blank lines, equal the old body's; CI arch-check runs just gen with no drift
Owner: The schema doc is now an index with five pages, one per subject; its text is unchanged.

<sub>note on 31c10a7 · git log --notes=why</sub>

## Why (round 2)

Decided: no code change for the perf FAIL; an empty commit reruns CI on the same docs-only tree
Because: crates/blocks/tests/perf.rs:36
Rejected: raising the HTML write budget — a refactor slice changes no test body, and the miss was 0.5 ms of runner noise
Check: the diff against staging touches only docs/schema* and .drover/arch.toml; the perf job is green at the new head
Owner: The only red check was a timing test that ran slightly slow on the CI machine; nothing in this change can affect it.

<sub>note on a643246 · git log --notes=why</sub>


