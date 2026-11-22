#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
npm --prefix web ci --no-audit --no-fund
ls web/dist/*.js >/dev/null 2>&1 || npm --prefix web run build
cargo run -q --locked -p blocks --features schema --bin blocks-codegen kinds
cargo run -q --locked -p blocks --features schema --bin blocks-codegen
npm --prefix web run build
BLOCKS_GEN=1 cargo test -q --locked -p blocks --test sim generated
BLOCKS_GEN=1 cargo test -q --locked -p blocks --test gesture generated
BLOCKS_GEN=1 cargo test -q --locked -p blocks --test check generated
BLOCKS_GEN=1 cargo test -q --locked -p blocks --test fixtures every_kind_has_a_stress_row
BLOCKS_GEN=1 cargo test -q --locked -p blocks --test theme css_writes_each_fixtures_css_file
BLOCKS_GEN=1 cargo test -q --locked --manifest-path demo/client/Cargo.toml generated
