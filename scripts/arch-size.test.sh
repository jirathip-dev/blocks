#!/bin/sh
set -eu
here=$(cd "$(dirname "$0")/.." && pwd)
drover=${DROVER:-drover}
t=$(mktemp -d)
trap 'rm -rf "$t"' EXIT
mkdir -p "$t/.drover" "$t/web/src/gen" "$t/web/test" "$t/swift/Sources/Blocks/Gen"
awk '/^\[/ { on = ($0 == "[[size]]") } on' "$here/.drover/arch.toml" > "$t/.drover/arch.toml"
lines() { awk -v n="$1" -v l="$2" 'BEGIN { for (i = 0; i < n; i++) print l }'; }
lines 600 'export const a = 1;' > "$t/web/src/gen/g.ts"
lines 600 'let a = 1' > "$t/swift/Sources/Blocks/Gen/G.swift"
lines 999 'export const a = 1;' > "$t/web/test/t.test.ts"
{ echo 'export function f(): number {'; lines 77 '  void 0;'; echo '  return 1;'; echo '}'; } > "$t/web/src/ok.ts"
(cd "$t" && "$drover" arch-check) > "$t/ok.log" 2>&1 || { echo "at caps failed: $(cat "$t/ok.log")" >&2; exit 1; }
lines 501 'export const a = 1;' > "$t/web/src/big.ts"
lines 1001 'export const a = 1;' > "$t/web/test/big.test.ts"
{ echo 'export function f(): number {'; lines 78 '  void 0;'; echo '  return 1;'; echo '}'; } > "$t/web/src/ok.ts"
if (cd "$t" && "$drover" arch-check) > "$t/over.log" 2>&1; then echo "over caps passed: $(cat "$t/over.log")" >&2; exit 1; fi
for want in 'web/src/big.ts` is 501 lines, over 500' 'web/test/big.test.ts` is 1001 lines, over 1000' 'web/src/ok.ts:f` is 81 lines, over 80'; do
  grep -qF "$want" "$t/over.log" || { echo "missing: $want in $(cat "$t/over.log")" >&2; exit 1; }
done
if grep -q 'Gen/\|gen/' "$t/over.log"; then echo "generated file flagged: $(cat "$t/over.log")" >&2; exit 1; fi
echo "arch size tests pass"
