#!/bin/sh
set -eu
here=$(cd "$(dirname "$0")/.." && pwd)
t=$(mktemp -d)
trap 'rm -rf "$t"' EXIT
printf '## For humans\r\n\r\nA change.\r\n' > "$t/bare"
printf '## For humans\r\n\r\nA change.\r\n\r\nFor apps: nothing to do, the new field is optional.\r\n' > "$t/line"
for p in schema/blocks.schema.json crates/blocks/src/kind/content.rs crates/blocks/src/wire.rs web/src/gen/types.ts \
  swift/Sources/Blocks/Gen/Types.swift web/src/blocks.css crates/blocks/src/theme/scheme.rs swift/Sources/BlocksUI/Style.swift; do
  if printf 'README.md\n%s\n' "$p" | sh "$here/scripts/for-apps.sh" "$t/bare" > "$t/out.log" 2>&1; then
    echo "$p without a For apps line passed: $(cat "$t/out.log")" >&2
    exit 1
  fi
  grep -q "^for-apps: $p changes what an app sees" "$t/out.log" || { echo "$p: got: $(cat "$t/out.log")" >&2; exit 1; }
  printf '%s\n' "$p" | sh "$here/scripts/for-apps.sh" "$t/line" > "$t/out.log" || { echo "$p with the line failed" >&2; exit 1; }
done
out=$(printf 'README.md\ncrates/blocks/src/tree.rs\nweb/src/render.ts\n' | sh "$here/scripts/for-apps.sh" "$t/bare")
test "$out" = "for-apps: no path in ci/for-apps.paths changed; no line needed" || { echo "untouched: got: $out" >&2; exit 1; }
echo "for-apps tests pass"
