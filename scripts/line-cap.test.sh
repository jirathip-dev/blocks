#!/bin/sh
set -eu
here=$(cd "$(dirname "$0")/.." && pwd)
t=$(mktemp -d)
trap 'rm -rf "$t"' EXIT
mkdir -p "$t/scripts" "$t/ci/cap.d" "$t/crates/a/src" "$t/crates/a/tests" "$t/web/src/gen" "$t/web/shot" "$t/swift/Sources/Blocks/Gen"
cp "$here/scripts/line-cap.sh" "$t/scripts/"
printf '[fleet.blocks]\nline_cap = 7\nwarn_within = 0\n' > "$t/ci/cap.toml"
printf 'fn a() {}\n\n#[cfg(test)]\nmod t {}\n' > "$t/crates/a/src/lib.rs"
printf 'fn t() {}\n' > "$t/crates/a/tests/t.rs"
printf 'export {};\nexport {};\n' > "$t/web/src/a.ts"
printf 'x\n' > "$t/web/src/a.test.ts"
printf 'x\n' > "$t/web/src/gen/g.ts"
printf 'export {};\n' > "$t/web/shot/s.ts"
printf 'x\n' > "$t/web/shot/s.test.ts"
printf 'let a = 1\nlet b = 2\n' > "$t/swift/Sources/Blocks/A.swift"
printf 'x\n' > "$t/swift/Sources/Blocks/Gen/G.swift"
out=$(sh "$t/scripts/line-cap.sh")
test "$out" = "non-test lines: 7 / cap 7" || { echo "at cap: got: $out" >&2; exit 1; }
printf 'let c = 3\n' >> "$t/swift/Sources/Blocks/A.swift"
if sh "$t/scripts/line-cap.sh" > "$t/over.log"; then echo "over cap passed: $(cat "$t/over.log")" >&2; exit 1; fi
grep -qx 'non-test lines: 8 / cap 7' "$t/over.log" || { echo "over cap: got: $(cat "$t/over.log")" >&2; exit 1; }
printf 'line_cap = 8\n' > "$t/ci/cap.d/raise.toml"
sh "$t/scripts/line-cap.sh" > /dev/null || { echo "cap.d raise ignored" >&2; exit 1; }
echo "line-cap tests pass"
