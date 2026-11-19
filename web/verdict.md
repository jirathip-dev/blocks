PASS

Reviewed head: 41052aca62b4bfe076e02a0429ea80150296202a
Tests checked against anti-patterns: yes

Note: the worktree started at 548891c, behind the PR head (origin/issue-42, 41052ac). I checked out 41052ac detached and reviewed that. The PR body evidence names 41052ac, so it is not stale.

Checked:
- diff.ts and site/diff.rs match the approved design's diff.js and diff.css (q2184: no tint, no line numbers, hunks drawn in full). blocks.css carries the same rules as diff.css.
- No `gap(` for diff is left in web/src/render. `diff` is dropped from the gaps list in render.test.ts.
- fixtures/trees/diff.json now says native. The render tests assert real DOM output and the site test asserts the written HTML, including the empty-hunks and fallback cases.
- PR body has `## For humans`, no "Generated with" line, and no AI co-author trailers in the new commits. The why note matches the diff.
- `cargo test -p blocks --all-features --locked` passes. web `npm run check` and `npm run lint` pass.

Could NOT verify:
- web/test/shot.test.ts and web/test/site.test.ts need `playwright`, which is not installed here, so `blocks-shot --check` for diff.json and the JS-versus-Rust writer parity test did not run.
- `npm run build` failed because esbuild is missing, so I could not check web/dist drift.
- CI was still pending (8 checks) and I did not run cargo deny, arch-check, perf/sim or the swift build.
- No `## Parity` check: docs/parity.md is not in the diff, and I did not look for it.

Non-blocking: docs/design/diff/diff.js has a `//` comment. It is preview-only and not in web/src.
