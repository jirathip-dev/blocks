# Consuming blocks

An app pins a commit on blocks' `staging`: Cargo `rev`, npm `#<sha>`, SwiftPM `revision`, with a test in the app
that the pins agree. No manifest names a tag (ADR part 9, q2100).

## Releases

- A push to `main` whose push workflows (`ci`, `web`, `swift`, `cap`, `compat`) all end green is tagged and
  published as a GitHub release by `release.yml` (`scripts/release.sh`). A red or unfinished one publishes nothing.
- The tag is `v<SCHEMA_VERSION>.<n>`: `SCHEMA_VERSION` from `crates/blocks/src/lib.rs`, `<n>` counting that
  version's earlier tags from 0. A commit is tagged once.
- Before moving its pin, an app reads the releases between its pinned commit and the new one
  (`gh release list -R jirathip-dev/blocks`, or the repo's Releases page). Each release's notes open with a
  "For apps" section: every `For apps:` line of the PRs merged since the previous tag, so an app owner reads only
  that. Below it, each PR's title and `## For humans` text. The lines are read from the PRs, not the commits.
- A PR that touches a path in `ci/for-apps.paths` (the schema, the wire, a generated builder or type, the look)
  carries a `For apps:` line in its body; `ci.yml` fails it without one (`scripts/for-apps.sh`).
- A release carries the headless harnesses once they exist: `blocks-shot-x86_64-unknown-linux-gnu` and
  `blocks-snap-aarch64-apple-darwin`.

## Compatibility

`compat.yml` (`scripts/compat.sh`) takes the last tag of this `SCHEMA_VERSION` and of the one before, and runs:

- that tag's crate and TS protocol tests on today's `fixtures/protocol`, one case per row of the versioning table
  (`docs/schema.md`): `unknown-kind`, `unknown-field`, `unknown-word`, `unknown-op`, `version-before`,
  `version-app`, `version-server`;
- that release's `blocks-shot` and `blocks-snap` with `--check` on today's `fixtures/screens`, when it carries them.

A version with no tag yet is skipped, so the job is green until the first release and gates every PR after it.
`sh scripts/release.test.sh` checks the tag rule and the notes with a stand-in `gh`; `sh scripts/for-apps.test.sh` checks
the For apps rule.
