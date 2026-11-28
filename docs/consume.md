# Consuming blocks

An app pins a release: the tag `v<S>.<n>` is version `<S>.<n>.0` on npm, crates.io and SwiftPM, with a test in the
app that the pins agree:

```sh
npm install @jirathip-dev/blocks@<version>
```

```toml
[dependencies]
blocks = "<version>"
```

SwiftPM pins `exact:` on the tag (`exact: "2.2.0"`). An app that needs a commit on blocks' `staging` before it is
released pins it instead: npm `github:jirathip-dev/blocks#<sha>`, Cargo `rev`, SwiftPM `revision`.

## Client-built from the app's own Rust

An app whose Rust builds its screens (wasm in the page, native behind its FFI on iOS) hands them to `mount` through
`local({ screen, act })` and to `BlocksView` as a `Block`: `docs/client-built.md`.

## The npm package

An app's page takes blocks' web code from npm, or a staging commit by its 40-hex pin; neither runs a build, the files
are the committed `web/dist`:

```sh
npm install @jirathip-dev/blocks@<version>     # pnpm add, bun add: the same spec
npm install github:jirathip-dev/blocks#<sha>   # a staging commit
```

```ts
import { choose, css, tiles, type Scheme } from "@jirathip-dev/blocks";
import { adopt, mount, render } from "@jirathip-dev/blocks/shell";
import "@jirathip-dev/blocks/blocks.css";

const dark = matchMedia("(prefers-color-scheme: dark)").matches;
const wear: Scheme = choose(localStorage.getItem("b:look"), dark, schemes);
style.textContent = tiles + css(wear);
```

- `@jirathip-dev/blocks`: the core (generated types, the evaluator, `tree`, `gate`), `choose` (the owner's
  named scheme when on offer, else the device's default) and the one CSS writer: `css(scheme)` for one scheme,
  `css({ light, dark }, { space, motion })` for the crate's `theme::css` text, `tiles` for the default style.
- `@jirathip-dev/blocks/shell`: the HTML renderer and shell (`web/dist/blocks.js`): `mount`, `adopt`, `render`.
- `web/test/consume.test.ts` packs the root, installs it into an empty project and type-checks these imports.

## Releases

- A push to `main` whose push workflows (`ci`, `web`, `swift`, `cap`, `compat`) all end green is tagged and
  published as a GitHub release by `release.yml` (`scripts/release.sh`). A red or unfinished one publishes nothing.
- The tag is `v<SCHEMA_VERSION>.<n>`: `SCHEMA_VERSION` from `crates/blocks/src/lib.rs`, `<n>` counting that
  version's earlier tags from 0. A commit is tagged once.
- The tag is the version: `v<S>.<n>` needs the workspace `version` in `Cargo.toml` and `package.json`'s `version` at
  `<S>.<n>.0`, bumped together in the commit that is released; else `release.sh` tags nothing and fails, naming the
  version it wanted and each file's. The `package` gate fails a PR whose two versions disagree.
- After the release, the same job publishes the tagged files: `npm publish --access public --provenance` (the committed
  `web/dist`, no rebuild), then `cargo publish` of `blocks` and `blocks-cli` (`scripts/publish.sh`). Both registries
  take GitHub's OIDC token (trusted publishing); no publish token is stored. A version already on a registry is
  skipped with a log line. `blocks-desk`, `blocks-desktop` and `blocks-site` are not published.
- A failed or partial publish runs again from the Actions tab: `release.yml`'s "Run workflow" with the tag
  (`gh workflow run release.yml -R jirathip-dev/blocks -f tag=v2.2`).
- Each package holds only its files: the npm tarball `package.json`, `README.md`, `LICENSE` and `web/dist`'s listed
  files; each crate its `Cargo.toml`, `src/`, `README.md` and `LICENSE` (blocks-cli also its `templates/`). The lists
  are `ci/package/*.txt`; the `package` gate packs all three on every PR and fails on a file outside or missing from
  its list, and runs publint and attw (`--profile esm-only`) on the tarball.
- Before moving its pin, an app reads the releases between its pinned commit and the new one
  (`gh release list -R jirathip-dev/blocks`, or the repo's Releases page). Each release's notes open with a
  "For apps" section: every `For apps:` line of the PRs merged since the previous tag, so an app owner reads only
  that. Below it, each PR's title and `## For humans` text. The lines are read from the PRs, not the commits.
- A PR that touches a path in `ci/for-apps.paths` (the schema, the wire, a generated builder or type, the look)
  carries a `For apps:` line in its body; `ci.yml` fails it without one (`scripts/for-apps.sh`).
- A release carries the headless harnesses once they exist: `blocks-shot-x86_64-unknown-linux-gnu` and
  `blocks-snap-aarch64-apple-darwin`.

## Registry setup (the owner, once)

Before the first CI publish, each name is published once by hand as a `0.0.0` placeholder, then linked to trusted
publishing for repo `jirathip-dev/blocks`, workflow `release.yml`:

- npm: in a scratch folder with a `package.json` of name `@jirathip-dev/blocks`, version `0.0.0`:
  `npm publish --access public`; then the package's Settings → Trusted publisher → GitHub Actions.
- crates.io: a scratch crate per name (`blocks`, `blocks-cli`) at `0.0.0` with `description`, `license = "MIT"` and
  `repository`: `cargo publish`; then each crate's Settings → Trusted Publishing → GitHub.

`v2.1` was tagged before this and is not published; the first published version is `v2.2` (`2.2.0`).

## Compatibility

`compat.yml` (`scripts/compat.sh`) takes the last tag of this `SCHEMA_VERSION` and of the one before, and runs:

- that tag's crate and TS protocol tests on today's `fixtures/protocol`, one case per row of the versioning table
  (`docs/schema.md`): `unknown-kind`, `unknown-field`, `unknown-word`, `unknown-op`, `version-before`,
  `version-app`, `version-server`;
- that release's `blocks-shot` and `blocks-snap` with `--check` on today's `fixtures/screens`, when it carries them.

A version with no tag yet is skipped, so the job is green until the first release and gates every PR after it.
`sh scripts/release.test.sh` checks the tag rule, the version refusal and the notes with a stand-in `gh`;
`sh scripts/publish.test.sh` checks the tag→version rule, the mismatch refusal and the already-published no-op with
stand-in `npm`, `cargo` and `curl`; `sh scripts/for-apps.test.sh` checks
the For apps rule.
