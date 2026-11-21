# Dependencies

Every direct dependency of `Cargo.toml`, the crates and the root `package.json` is listed with its reason in
`.gatekeeper/deps.toml`; CI's `core/deps` gate fails otherwise. A new one needs the owner's OK in an issue, then a line
there. No transport (tokio, HTTP): those live in drover and cooee. `blocks`, `crates/blocks-cli`'s path dependency on
this repo's own crate, is the workspace's own and needs no line.

## Dev tools (bench/ only)

`bench/` (`docs/bench.md`) is outside the crate, the bundle and the Swift package, and an arch-check ban keeps it
there. Its dependencies are dev tools, pinned in `bench/Cargo.lock` and `bench/package-lock.json` (q2111), and are not
in `.gatekeeper/deps.toml`:

- bench: React `react` and `react-dom` 19.3.1, the React side of the comparison
- bench: topcoat `topcoat` and `topcoat-cli` 0.11.0 (the version cooee pins), the topcoat side and its asset bundler
- bench: `tokio`, the topcoat server's runtime; the blocks bench server uses std only
- bench: `esbuild` 0.28.2 (React's production bundle) and `playwright` 1.63.0 (the harness's WebKit), as in `web/`
