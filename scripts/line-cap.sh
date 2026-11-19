#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
cap=$(cat ci/cap.toml ci/cap.d/*.toml 2>/dev/null | sed -n 's/^line_cap *= *\([0-9]*\).*/\1/p' | sort -n | tail -n 1)
test -n "$cap" || { echo "line_cap missing from ci/cap.toml" >&2; exit 2; }
warn=$(sed -n 's/^warn_within *= *\([0-9]*\).*/\1/p' ci/cap.toml)
n=$({
  find src crates/*/src site/src bench -name '*.rs' ! -path '*/target/*' ! -path '*/node_modules/*' -exec awk '/^[[:space:]]*#\[cfg\(test\)\]/ { exit } { n++ } END { print n + 0 }' {} \; 2>/dev/null || true
  find web/src web/shot -name '*.ts' ! -name '*.test.ts' ! -path 'web/src/gen/*' -exec cat {} + 2>/dev/null | wc -l
  find bench -name '*.js' ! -path '*/target/*' ! -path '*/node_modules/*' -exec cat {} + 2>/dev/null | wc -l
  find swift/Sources -name '*.swift' ! -path 'swift/Sources/Blocks/Gen/*' -exec cat {} + 2>/dev/null | wc -l
} | awk '{ s += $1 } END { print s + 0 }')
echo "non-test lines: $n / cap $cap"
left=$((cap - n))
test "$left" -ge "${warn:-500}" || test "$left" -lt 0 || echo "WARN: $left lines of headroom (< ${warn:-500})"
test "$left" -ge 0
