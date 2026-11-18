drover := env("DROVER", "drover")
test_allow := "-A clippy::unwrap_used -A clippy::expect_used -A clippy::panic -A clippy::indexing_slicing -A clippy::as_conversions -A clippy::print_stdout -A clippy::print_stderr -A clippy::let_underscore_must_use"

# Every gate CI runs, in one go; passes on a clean tree.
check: fmt clippy fixtures test perf soak deps deny web arch cap actionlint swift

# Every generated file (.drover/arch.toml `generated`) from the Rust types; arch-check fails on a difference.
gen:
    cargo run -q --locked -p blocks --features schema --bin blocks-codegen

fmt:
    cargo fmt --check

# Pedantic everywhere; the banned APIs are denied outside tests (clippy.toml and the -A list let tests use them).
clippy:
    cargo clippy --workspace --all-features --lib --bins --locked -- -D warnings
    cargo clippy --workspace --all-features --tests --locked -- -D warnings {{test_allow}}

# Each ci/lint-fixtures/rust/<lint>.rs fails clippy and each web/lint-fixtures/<name>.ts fails web/lint.mjs.
fixtures: web-install
    scripts/lint-fixtures.sh rust
    scripts/lint-fixtures.sh ts

test:
    cargo test --workspace --all-features --locked

# The hard perf gate in release: each budget is in crates/blocks/tests/perf.rs.
perf:
    cargo test --release --locked -p blocks --test perf -- --nocapture --test-threads=1

# A stream's memory stays flat over 200,000 frames and 400 reconnects.
soak:
    cargo test --release --locked -p blocks --test soak -- --ignored --nocapture

# `just sim [n]`: n (default 500) random seeds of the ops protocol from BLOCKS_SIM_FROM (default 1000); each failure
# prints its seed and replay line. The fixed seeds in crates/blocks/tests/sim.rs run in `just test`.
sim n="500":
    BLOCKS_SIM_N={{n}} cargo test --release --locked -p blocks --test sim random_seeds -- --ignored

deps:
    scripts/deps-gate.sh

deny:
    cargo deny --locked check

web-install:
    npm --prefix web ci --no-audit --no-fund

web: web-install
    npm --prefix web run check
    npm --prefix web run lint

# Layers, bans, sizes, frozen and generated files; BASE and PR_BODY narrow the comment and doc checks to a PR.
arch:
    {{drover}} arch-check ${BASE:+--base "$BASE"} ${PR_BODY:+--pr-body "$PR_BODY"}

# The src/ line cap and the 30-line rules file.
cap:
    {{drover}} cap-check --config ci/cap.toml ${BASE:+--base "$BASE"}

actionlint:
    actionlint -color

# The generated Swift types decode and re-encode the Rust sample; macOS only (CI's swift job).
swift:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ "$(uname)" != Darwin ]; then echo "swift: macOS only, skipped (CI's swift job runs it)"; exit 0; fi
    cd swift && swift test
