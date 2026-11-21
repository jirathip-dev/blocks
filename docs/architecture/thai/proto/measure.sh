#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
font=../../../../crates/blocks-desk/tests/thai/NotoSansThai-Regular.ttf
out=${CARGO_TARGET_DIR:-target}
case "${1:-}" in
  size)
    for f in "" plain dict lstm; do
      cargo build --quiet --release --manifest-path size/Cargo.toml --target-dir "$out/size-${f:-none}" ${f:+--features "$f"}
      bin="$out/size-${f:-none}/release/thai-size"
      [ -f "$bin.exe" ] && bin="$bin.exe"
      cp "$bin" "$out/stripped-${f:-none}"
      strip "$out/stripped-${f:-none}"
      echo "${f:-none}: $(wc -c < "$bin") bytes, stripped $(wc -c < "$out/stripped-${f:-none}")"
    done
    ;;
  deps)
    for f in dict lstm; do
      n=$(cargo tree --manifest-path size/Cargo.toml --features "$f" --prefix none -e normal,build | sed 's/ .*//' | sort -u | grep -vc thai-size)
      echo "$f: $n crates in a tree of its own"
    done
    cargo tree --manifest-path size/Cargo.toml --features dict --prefix none -e normal,build | sed 's/ (\*)//' | sort -u | grep -v thai-size
    ;;
  gaps) cargo run --quiet -- gaps --font "$font"; cargo run --quiet -- gaps --first "$font" ;;
  probe) cargo run --quiet -- probe --font "$font" ;;
  first) cargo run --quiet -- probe --first "$font" ;;
  none) cargo run --quiet -- probe ;;
  seg) cargo run --quiet -- seg ;;
  flow) cargo run --quiet -- flow --font "$font" ;;
  edit) cargo run --quiet -- edit --font "$font"; cargo run --quiet -- edit --own --font "$font" ;;
  copy) cargo run --quiet -- copy --font "$font"; cargo run --quiet -- copy --own --font "$font" ;;
  shot) mkdir -p out; cargo run --quiet -- shot out/noto.png --font "$font" ;;
  same) cargo run --quiet -- same --font "$font" ;;
  deny)
    root=$(cd ../../../.. && pwd)
    tmp=$(mktemp -d)
    (cd "$root" && cp -R Cargo.toml Cargo.lock deny.toml rust-toolchain.toml crates site "$tmp/")
    cd "$tmp"
    before=$(grep -c '^name = ' Cargo.lock)
    sed -i.bak 's/^serde_json = "1"$/serde_json = "1"\nicu_segmenter = { version = "2.4", default-features = false, features = ["compiled_data"] }/' Cargo.toml
    sed -i.bak 's/^egui.workspace = true$/egui.workspace = true\nicu_segmenter.workspace = true/' crates/blocks-desktop/Cargo.toml
    cargo metadata --format-version 1 > /dev/null
    echo "packages in the workspace's lock: $before -> $(grep -c '^name = ' Cargo.lock)"
    cargo deny --locked check 2>&1 | tail -1
    rm -rf "$tmp"
    ;;
  bench) cargo run --quiet --release -- bench --font "$font" ;;
  *) echo "usage: measure.sh size|deps|deny|gaps|probe|first|none|seg|flow|edit|copy|same|shot|bench" >&2; exit 2 ;;
esac
