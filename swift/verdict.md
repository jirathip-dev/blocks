PASS

Reviewed head: 4d825b8bda091629a342d3b2f3019d8ff7d5852c
Tests checked against anti-patterns: yes

Findings: no blocking findings.

Checked at this head:
- `cargo test --workspace`: all suites pass (includes crates/blocks/tests/append.rs, guard.rs, site_message.rs, desk.rs).
- `swift test --package-path swift`: 96 tests, 0 failures (1 skipped).
- `cargo fmt --all --check`: clean.
- Code read against the ADR: `message` (blocks + files, optional time), `tool` kind, `prose.streaming`, `Op::Append` written only by `diff` (text-only when only the last text grew, else keep + parts), `wire::old` fallback, `apply` moved to web/src/core/apply.ts, three guard rules with fix text and fixtures. No Co-authored-by trailers in the branch commits.

Non-blocking:
- `cargo clippy --workspace --all-targets` reports unwrap/index/as errors in blocks-cli integration tests (tests "check" and "skill"). I did not compare against staging, so I can't say whether they predate this PR; the CI clippy job decides.

Could NOT verify:
- The web (TS) tests, React tests, the `blocks-shot` look check and the HTML/React renderers at runtime. The worktree has no node_modules, so playwright and esbuild are missing; I read the code only.
- The `ui` job and its ui-390 screenshots, and the look at 1440/390 in light and dark against docs/design/message. CI was still pending on web, react, rust, swift and desktop when I checked.
- egui drawing, by running it: the desk harness test passes, but I did not view pixels.
- Generated-file drift (`just gen`). I did not run it, because it writes into the tree.
- The "no `docs/parity.md`" rule: the file does not exist in this repo, so the parity check does not apply.
