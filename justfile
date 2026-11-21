# Every gate CI runs (the core, rust and ts packs and .gatekeeper/gates/), the same as drover turn done.
check:
    ./.gatekeeper/run check

# Every generated file (.drover/arch.toml `generated`) from the Rust types; arch-check fails on a difference.
gen:
    sh scripts/gen.sh

# `just sim [n]`: n (default 500) random seeds from BLOCKS_SIM_FROM (default 1000): the ops protocol (a failure prints its
# seed and replay line), then one corpus of screens, op sequences and expressions the crate writes and TS and Swift read
# (a difference prints its seed and the shortest case). The fixed seeds in crates/blocks/tests/sim.rs run in the test gate.
sim n="500":
    #!/usr/bin/env bash
    set -euo pipefail
    export BLOCKS_SIM_N={{n}} BLOCKS_SIM_CORPUS="{{justfile_directory()}}/target/sim-corpus.json"
    cargo test --release --locked -p blocks --test sim -- --ignored
    node --no-warnings --test web/test/sim.test.ts
    if [ "$(uname)" = Darwin ]; then swift test --filter SimTests; else echo "sim: Swift is macOS only, skipped"; fi

web-install:
    npm --prefix web ci --no-audit --no-fund

# The token lint on the SwiftUI views (ci/tokens), then the Swift package's tests, warnings as errors; macOS only (CI's swift leg).
swift:
    #!/usr/bin/env bash
    set -euo pipefail
    node --no-warnings web/lint.mjs swift/Sources/BlocksUI
    if [ "$(uname)" != Darwin ]; then echo "swift: macOS only, skipped (CI's swift leg runs it)"; exit 0; fi
    BLOCKS_STRICT=1 swift test

# The 200-row screen in blocks, React and topcoat in headless WebKit (docs/bench.md); writes bench/results.json and docs/bench-blocks.json.
bench:
    cd bench && cargo build --release --locked
    cd bench && cargo run -q --release --locked --bin topcoat -- asset bundle --release --bin topcoat-bench
    npm --prefix bench ci --no-audit --no-fund
    npm --prefix bench run build
    npm --prefix bench run bench
