drover := env("DROVER", "drover")
test_allow := "-A clippy::unwrap_used -A clippy::expect_used -A clippy::panic -A clippy::indexing_slicing -A clippy::as_conversions -A clippy::print_stdout -A clippy::print_stderr -A clippy::let_underscore_must_use"

# Every gate CI runs, in one go; passes on a clean tree.
check: fmt clippy fixtures test guard perf soak deps deny web arch cap actionlint swift desktop

# Every generated file (.drover/arch.toml `generated`) from the Rust types; arch-check fails on a difference.
gen: web-install
    cargo run -q --locked -p blocks --features schema --bin blocks-codegen kinds
    cargo run -q --locked -p blocks --features schema --bin blocks-codegen
    npm --prefix web run build
    BLOCKS_GEN=1 cargo test -q --locked -p blocks --test sim generated
    BLOCKS_GEN=1 cargo test -q --locked -p blocks --test gesture generated
    BLOCKS_GEN=1 cargo test -q --locked -p blocks --test check generated
    BLOCKS_GEN=1 cargo test -q --locked -p blocks --test fixtures every_kind_has_a_stress_row
    BLOCKS_GEN=1 cargo test -q --locked -p blocks --test theme css_writes_each_fixtures_css_file

fmt:
    cargo fmt --check

# Pedantic everywhere; the banned APIs are denied outside tests (clippy.toml and the -A list let tests use them).
clippy:
    cargo clippy --workspace --all-features --lib --bins --locked -- -D warnings
    cargo clippy --workspace --all-features --tests --locked -- -D warnings {{test_allow}}

# Each ci/lint-fixtures/rust/<lint>.rs fails clippy and each web/lint-fixtures/<name>.ts and ci/lint-fixtures/swift/<name>.swift fails web/lint.mjs.
fixtures: web-install
    scripts/lint-fixtures.sh rust
    scripts/lint-fixtures.sh ts
    scripts/lint-fixtures.sh swift

test:
    cargo test --workspace --all-features --locked

# `blocks check` on this repo's screens (.blocks/guard.json); BASE narrows it to the fixtures a branch changed.
guard:
    cargo run -q --locked -p blocks-cli -- check ${BASE:+--base "$BASE"}

# The hard perf gate in release: each budget is in crates/blocks/tests/perf.rs.
perf:
    cargo test --release --locked -p blocks --test perf -- --ignored --nocapture --test-threads=1

# A stream's memory stays flat over 200,000 frames and 400 reconnects.
soak:
    cargo test --release --locked -p blocks --test soak -- --ignored --nocapture

# `just sim [n]`: n (default 500) random seeds from BLOCKS_SIM_FROM (default 1000): the ops protocol (a failure prints its
# seed and replay line), then one corpus of screens, op sequences and expressions the crate writes and TS and Swift read
# (a difference prints its seed and the shortest case). The fixed seeds in crates/blocks/tests/sim.rs run in `just test`.
sim n="500":
    #!/usr/bin/env bash
    set -euo pipefail
    export BLOCKS_SIM_N={{n}} BLOCKS_SIM_CORPUS="{{justfile_directory()}}/target/sim-corpus.json"
    cargo test --release --locked -p blocks --test sim -- --ignored
    node --no-warnings --test web/test/sim.test.ts
    if [ "$(uname)" = Darwin ]; then swift test --filter SimTests; else echo "sim: Swift is macOS only, skipped"; fi

deps:
    scripts/deps-gate.sh

# The desktop renderer's tests (docs/architecture/desktop/), then the blocks crate's tree, which must link no egui.
desktop:
    #!/usr/bin/env bash
    set -euo pipefail
    cargo test --locked -p blocks-desktop
    tree=$(cargo tree --locked -p blocks --all-features --target all -e normal,build --prefix none)
    if grep -q egui <<<"$tree"; then echo "the blocks crate links egui"; exit 1; fi
    echo "desktop: the blocks crate links no egui"

deny:
    cargo deny --locked check

web-install:
    npm --prefix web ci --no-audit --no-fund

web: web-install
    npm --prefix web run check
    npm --prefix web run lint
    npm --prefix web run test

# Layers, bans, sizes, frozen and generated files; BASE and PR_BODY narrow the comment and doc checks to a PR.
arch:
    {{drover}} arch-check ${BASE:+--base "$BASE"} ${PR_BODY:+--pr-body "$PR_BODY"}
    DROVER={{drover}} sh scripts/arch-size.test.sh
    DROVER={{drover}} sh scripts/arch-ban.test.sh

# The line cap in ci/cap.toml (non-test, non-generated Rust, TS and Swift; CI's cap workflow), the For apps check's test and the 30-line rules file.
cap:
    sh scripts/line-cap.sh
    sh scripts/line-cap.test.sh
    sh scripts/for-apps.test.sh
    test "$(wc -l < .drover/rules.md)" -le 30 || { echo ".drover/rules.md is over 30 lines"; exit 1; }

actionlint:
    actionlint -color

# The token lint on the SwiftUI views (ci/tokens), then the Swift package's tests, warnings as errors; macOS only (CI's swift job).
swift:
    #!/usr/bin/env bash
    set -euo pipefail
    node --no-warnings web/lint.mjs swift/Sources/BlocksUI
    if [ "$(uname)" != Darwin ]; then echo "swift: macOS only, skipped (CI's swift job runs it)"; exit 0; fi
    BLOCKS_STRICT=1 swift test

# bench/ builds: its two servers (blocks on Shelf, topcoat), its React bundle and its runner; CI's bench job, never a gate on the numbers.
bench-build:
    cd bench && cargo build --locked
    npm --prefix bench ci --no-audit --no-fund
    npm --prefix bench run build
    node --check bench/run.js

# The 200-row screen in blocks, React and topcoat in headless WebKit (docs/bench.md); writes bench/results.json and docs/bench-blocks.json.
bench:
    cd bench && cargo build --release --locked
    cd bench && cargo run -q --release --locked --bin topcoat -- asset bundle --release --bin topcoat-bench
    npm --prefix bench ci --no-audit --no-fund
    npm --prefix bench run build
    npm --prefix bench run bench
