#!/bin/sh
set -eu
here=$(cd "$(dirname "$0")/.." && pwd)
drover=${DROVER:-drover}
t=$(mktemp -d)
trap 'rm -rf "$t"' EXIT
mkdir -p "$t/.drover" "$t/web/src/core" "$t/web/shot"
awk '/^\[/ { on = ($0 == "[[ban]]") } on' "$here/.drover/arch.toml" > "$t/.drover/arch.toml"
echo 'export const a = 1;' > "$t/web/src/core/ok.ts"
(cd "$t" && "$drover" arch-check) > "$t/ok.log" 2>&1 || { echo "clean core failed: $(cat "$t/ok.log")" >&2; exit 1; }
echo 'export const a = () => document.title;' > "$t/web/src/core/dom.ts"
echo 'export { h } from "../render/index.ts";' > "$t/web/src/core/draw.ts"
echo 'export { useState } from "react";' > "$t/web/src/react.ts"
echo 'export { createElement } from "react";' > "$t/web/shot/shot.ts"
if (cd "$t" && "$drover" arch-check) > "$t/bad.log" 2>&1; then echo "bans passed: $(cat "$t/bad.log")" >&2; exit 1; fi
for want in 'web/src/core/dom.ts:1: `document.`' 'web/src/core/draw.ts:1: `render/`' 'web/src/react.ts:1: `from "react`' 'web/shot/shot.ts:1: `from "react`'; do
  grep -qF "$want" "$t/bad.log" || { echo "missing: $want in $(cat "$t/bad.log")" >&2; exit 1; }
done
echo "arch ban tests pass"
