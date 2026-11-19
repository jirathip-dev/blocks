#!/bin/sh
set -eu
here=$(cd "$(dirname "$0")/.." && pwd)
t=$(mktemp -d)
trap 'rm -rf "$t"' EXIT
mkdir -p "$t/scripts" "$t/ci/cap.d" "$t/crates/a/src" "$t/crates/a/tests" "$t/web/src/gen" "$t/web/shot" "$t/web/react/src/gen" "$t/swift/Sources/Blocks/Gen" "$t/site/src" "$t/bench/src" "$t/bench/node_modules/m"
cp "$here/scripts/line-cap.sh" "$t/scripts/"
printf '[fleet.blocks]\nline_cap = 12\nwarn_within = 0\n' > "$t/ci/cap.toml"
printf 'fn a() {}\n\n#[cfg(test)]\nmod t {}\n' > "$t/crates/a/src/lib.rs"
printf 'fn t() {}\n' > "$t/crates/a/tests/t.rs"
printf 'export {};\nexport {};\n' > "$t/web/src/a.ts"
printf 'x\n' > "$t/web/src/a.test.ts"
printf 'x\n' > "$t/web/src/gen/g.ts"
printf 'export {};\n' > "$t/web/shot/s.ts"
printf 'x\n' > "$t/web/shot/s.test.ts"
printf 'export {};\n' > "$t/web/react/src/v.ts"
printf 'x\n' > "$t/web/react/src/gen/views.ts"
printf 'let a = 1\nlet b = 2\n' > "$t/swift/Sources/Blocks/A.swift"
printf 'x\n' > "$t/swift/Sources/Blocks/Gen/G.swift"
printf 'fn s() {}\n' > "$t/site/src/main.rs"
printf 'fn b() {}\n\n#[cfg(test)]\nmod t {}\n' > "$t/bench/src/lib.rs"
printf 'run();\n' > "$t/bench/run.js"
printf 'x\n' > "$t/bench/node_modules/m/i.js"
printf '{}\n' > "$t/bench/package-lock.json"
out=$(sh "$t/scripts/line-cap.sh")
test "$out" = "non-test lines: 12 / cap 12" || { echo "at cap: got: $out" >&2; exit 1; }
printf 'let c = 3\n' >> "$t/swift/Sources/Blocks/A.swift"
if sh "$t/scripts/line-cap.sh" > "$t/over.log"; then echo "over cap passed: $(cat "$t/over.log")" >&2; exit 1; fi
grep -qx 'non-test lines: 13 / cap 12' "$t/over.log" || { echo "over cap: got: $(cat "$t/over.log")" >&2; exit 1; }
printf 'line_cap = 13\n' > "$t/ci/cap.d/raise.toml"
sh "$t/scripts/line-cap.sh" > /dev/null || { echo "cap.d raise ignored" >&2; exit 1; }
echo "line-cap tests pass"
