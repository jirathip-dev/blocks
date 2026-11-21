#!/usr/bin/env bash
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/../../../.." && pwd)
export CARGO_TARGET_DIR=${CARGO_TARGET_DIR:-$here/target}
out=${OUT:-$here/out}
mkdir -p "$out"
targets="x86_64-unknown-linux-gnu x86_64-pc-windows-msvc aarch64-apple-darwin"

bin() {
  local b="$CARGO_TARGET_DIR/release/$1"
  if [ -f "$b.exe" ]; then b="$b.exe"; fi
  echo "$b"
}
try() { "$@" || echo "FAILED($?): $*"; }
cap() {
  if command -v timeout > /dev/null; then timeout "$@"; else perl -e 'alarm shift; exec @ARGV' "$@"; fi
}

build() {
  for p in ${1:-min-egui min-gpui egui gpui}; do
    local from=$SECONDS
    if cargo build --release --locked --manifest-path "$here/$p/Cargo.toml"; then
      echo "built $p in $((SECONDS - from)) s"
    else
      echo "FAILED: build $p"
    fi
  done
}

size() {
  for b in min-egui min-gpui; do
    local f
    f=$(bin "$b")
    echo "$b bytes=$(wc -c < "$f" | tr -d ' ')"
    if command -v strip > /dev/null && cp "$f" "$out/$b.stripped" && strip "$out/$b.stripped" 2> /dev/null; then
      echo "$b stripped_bytes=$(wc -c < "$out/$b.stripped" | tr -d ' ')"
    fi
    rm -f "$out/$b.stripped"
  done
}

deps() {
  for p in min-egui min-gpui; do
    local m="$here/$p/Cargo.toml"
    echo "== $p: $(grep -c '^\[\[package\]\]' "$here/$p/Cargo.lock") packages in the lock"
    for t in $targets; do
      local n d
      n=$(cargo tree --manifest-path "$m" --locked -e normal,build --target "$t" --prefix none | sed 's/ (.*//' | sort -u | wc -l | tr -d ' ')
      d=$(cargo tree -d --manifest-path "$m" --locked -e normal,build --target "$t" --prefix none --depth 0 | awk 'NF { print $1 }' | sort -u | wc -l | tr -d ' ')
      echo "$p $t: crates=$((n - 1)) in_two_or_more_versions=$d"
    done
    cargo deny --manifest-path "$m" --locked --config "$root/deny.toml" check > "$out/deny-$p.txt" 2>&1
    echo "$p cargo deny: $(tail -n 1 "$out/deny-$p.txt")"
    grep -E '^error\[' "$out/deny-$p.txt" | sed 's/ for crate .*//; s/: crate .*//; s/: failed.*//; s/: detected.*//' | sort | uniq -c
    awk '/^error\[rejected\]/ { r = 1; next } r && /Cargo.toml:/ { n = split($0, a, "/"); crate = a[n - 1] } r && /license(-file)? = / { sub(/^[^=]*= /, ""); print "  licence refused: " crate " " $0; r = 0 }' "$out/deny-$p.txt" | sort -u
    grep -B1 -A6 'source-not-allowed' "$out/deny-$p.txt" | grep -oE 'git\+https://[^?#" ]+' | sort | uniq -c | sed 's/^/  git source refused:/'
    grep -E '^error\[banned\]' "$out/deny-$p.txt" | sed 's/^error\[banned\]: /  banned: /'
  done
}

shots() {
  local desk gpui egui
  try cargo build -q --locked --manifest-path "$root/Cargo.toml" -p blocks-desk
  desk="$CARGO_TARGET_DIR/debug/blocks-desk"
  if [ -f "$desk.exe" ]; then desk="$desk.exe"; fi
  gpui=$(bin blocks-gpui)
  egui=$(bin blocks-egui)
  "$egui" dump look > "$out/look.json"
  for s in 1440x900 390x844; do
    for scheme in light dark; do
      local w=${s%x*}
      try "$desk" --screen "$out/look.json" --size "$s" --scheme "$scheme" --out "$out/desk"
      try mv "$out/desk/look.png" "$out/egui-look-$w-$scheme.png"
      try "$gpui" repack "$out/egui-look-$w-$scheme.png"
      try "$gpui" shot look --size "$s" --scheme "$scheme" --out "$out/gpui-look-$w-$scheme.png"
    done
  done
  try "$gpui" shot scripts --size 390x844 --out "$out/gpui-scripts-390-light.png"
  try "$gpui" shot scripts --size 390x844 --scale 2 --out "$out/gpui-scripts-390-light-2x.png"
  rm -rf "$out/desk" "$out/look.json"
  ls "$out"
}

bench() {
  for s in 1440x900 390x844; do
    try "$(bin blocks-egui)" bench --size "$s"
    try "$(bin blocks-gpui)" bench --size "$s"
    try "$(bin blocks-gpui)" bench --size "$s" --gpu
  done
}

probe() {
  try "$(bin blocks-gpui)" probe
  try cap 60 "$(bin blocks-egui)" window look --size 400x300 --probe
}

window() {
  try cap 120 "$(bin blocks-gpui)" window rows --size 1440x900 --bench
  try cap 120 "$(bin blocks-egui)" window rows --size 1440x900 --bench
  try cap 60 "$(bin blocks-gpui)" shot look --window --size 1440x900 --out "$out/gpui-window-look-1440-light.png"
  try cap 60 "$(bin blocks-egui)" window scripts --size 390x844 --shot "$out/egui-scripts-390-light.png"
  ls -l "$out"
}

case "${1:-}" in
  build | size | deps | shots | bench | probe | window) "$@" ;;
  *) echo "usage: measure.sh build [crates] | size | deps | shots | bench | probe | window   (OUT=dir, default proto/out)" && exit 2 ;;
esac
