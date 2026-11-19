#!/bin/sh
set -eu
v=$(sed -n 's/^pub const SCHEMA_VERSION: u8 = \([0-9]*\);$/\1/p' crates/blocks/src/lib.rs)
[ -n "$v" ] || { echo "compat: no SCHEMA_VERSION in crates/blocks/src/lib.rs" >&2; exit 2; }
tags=""
for w in "$v" "$((v - 1))"; do
  t=$(git tag -l "v$w.*" --sort=-v:refname | head -n 1)
  if [ -n "$t" ]; then tags="$tags $t"; else echo "compat: no v$w.* release tag yet; skipped"; fi
done
here=$(pwd)

carries() {
  gh release view "$1" --json assets --jq '.assets[].name' | grep -qx "$2"
}

case "${1:-}" in
protocol)
  out=${2:?usage: compat.sh protocol <dir>}
  for t in $tags; do
    d="$out/$t"
    git worktree add --detach "$d" "$t"
    rm -rf "${d:?}/fixtures/protocol"
    cp -R fixtures/protocol "$d/fixtures/protocol"
    echo "compat: $t's crate and TS on today's fixtures/protocol"
    (cd "$d" && cargo test --locked -p blocks --test protocol)
    (cd "$d/web" && npm ci --no-audit --no-fund && node --no-warnings --test test/protocol.test.ts)
  done
  ;;
harness)
  out=${2:?usage: compat.sh harness <dir> <asset>}
  a=${3:?usage: compat.sh harness <dir> <asset>}
  for t in $tags; do
    if ! carries "$t" "$a"; then echo "compat: $t carries no $a; skipped"; continue; fi
    d="$out/$t"
    mkdir -p "$d"
    gh release download "$t" -p "$a" -D "$d" --clobber
    chmod +x "$d/$a"
    for f in fixtures/screens/*/*.json; do
      n=$(basename "$(dirname "$f")")-$(basename "$f" .json)
      echo "compat: $t's $a on $f"
      "$d/$a" --screen "$here/$f" --check --out "$d/out/$n"
    done
  done
  ;;
carries)
  a=${2:?usage: compat.sh carries <asset>}
  for t in $tags; do
    if carries "$t" "$a"; then exit 0; fi
  done
  exit 1
  ;;
*)
  echo "usage: compat.sh protocol <dir> | harness <dir> <asset> | carries <asset>" >&2
  echo "the last release tag of this version and the one before against today's fixtures (docs/consume.md)" >&2
  exit 2
  ;;
esac
