# Dependencies

Every direct dependency in a `Cargo.toml` must be on this list; CI's deps gate (`scripts/deps-gate.sh`) fails
otherwise. A new one needs the owner's OK in an issue, then a line here. No transport (tokio, HTTP): those live in
drover and cooee.

- `serde`: the wire types' derive
- `serde_json`: the wire format, serialize and parse
- `schemars`: the JSON Schema behind the `schema` feature, so codegen only; never in drover's build
- `egui`: the desktop renderer's toolkit, in `blocks-desktop` and `blocks-desk` only; never in the `blocks` crate
- `blocks`: `crates/blocks-cli`'s path dependency on this repo's own crate, so `blocks check` runs at the app's pin

## Dev tools (bench/ only)

`bench/` (`docs/bench.md`) is outside the crate, the bundle and the Swift package, and an arch-check ban keeps it
there. Its dependencies are dev tools, pinned in `bench/Cargo.lock` and `bench/package-lock.json` (q2111), and are not
on the allow-list above:

- bench: React `react` and `react-dom` 19.3.1, the React side of the comparison
- bench: topcoat `topcoat` and `topcoat-cli` 0.11.0 (the version cooee pins), the topcoat side and its asset bundler
- bench: `tokio`, the topcoat server's runtime; the blocks bench server uses std only
- bench: `esbuild` 0.28.2 (React's production bundle) and `playwright` 1.63.0 (the harness's WebKit), as in `web/`
