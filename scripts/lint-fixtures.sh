#!/usr/bin/env bash
# #809: each banned API's fixture must fail its gate, and clean fixtures must pass.
# ts: web/lint-fixtures/<name>.ts and <name>.css must fail web/lint.mjs (clean.ts and clean.css must pass).
# swift: ci/lint-fixtures/swift/<name>.swift must fail web/lint.mjs's token check (clean.swift must pass).
# Usage: scripts/lint-fixtures.sh ts|swift
set -euo pipefail
cd "$(dirname "$0")/.."
bad=0
expect() {
  local name=$1 code=$2 out=$3 want=$4
  if [ "$name" = clean ]; then
    [ "$code" -eq 0 ] && echo "ok: clean passes" || { echo "::error::clean fixture failed: $out"; bad=1; }
  elif [ "$code" -eq 0 ] || ! grep -q -e "$want" <<<"$out"; then
    echo "::error::fixture $name did not fail on $want: $out"
    bad=1
  else
    echo "ok: $name is refused"
  fi
}
case "${1:-}" in
ts)
  for f in web/lint-fixtures/*.ts web/lint-fixtures/*.css; do
    name=$(basename "$f"); name=${name%.*}
    code=0
    out=$(node --no-warnings web/lint.mjs "$f" 2>&1) || code=$?
    case $name in
    as-cast) want='an `as` cast' ;;
    non-null) want='a non-null' ;;
    any) want='`any`' ;;
    ts-ignore | ts-expect-error) want='@ts-' ;;
    inner-html | outer-html | insert-adjacent-html) want='raw HTML' ;;
    eval | new-function) want='`eval` / `new Function`' ;;
    console-log) want='console.log' ;;
    default-export) want='a default export' ;;
    enum) want='no `enum`' ;;
    motion) want='motion of `width' ;;
    raw-colour) want='raw `color #ff0000`' ;;
    raw-size) want='raw `padding 6px`' ;;
    stale) want='shrink the baseline' ;;
    *) want=$name ;;
    esac
    expect "$name" "$code" "$out" "$f:.*$want"
  done
  ;;
swift)
  for f in ci/lint-fixtures/swift/*.swift; do
    name=$(basename "$f" .swift)
    code=0
    out=$(node --no-warnings web/lint.mjs "$f" 2>&1) || code=$?
    case $name in
    raw-colour) want='raw `Color.red`' ;;
    raw-size) want='raw `spacing: 6`' ;;
    stale) want='shrink the baseline' ;;
    *) want=$name ;;
    esac
    expect "$name" "$code" "$out" "$f:.*$want"
  done
  ;;
*)
  echo "usage: $0 ts|swift" >&2
  exit 2
  ;;
esac
exit "$bad"
