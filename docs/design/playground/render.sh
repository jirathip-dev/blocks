#!/bin/sh
# Builds the inputs (node build.mjs), then renders each page light at 1440 and 390 wide, full height, settled, with Playwright's cached headless Chromium.
set -eu
cd "$(dirname "$0")"
[ "${SKIP_BUILD:-}" = 1 ] || node build.mjs
shell=$(ls -d "$HOME"/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell | tail -1)
shot() {
  page=$1 name=$2 w=$3
  set -- --headless --allow-file-access-from-files --force-prefers-reduced-motion --blink-settings=preferredColorScheme=1 --virtual-time-budget=4000
  h=$("$shell" "$@" --window-size="$w",900 --dump-dom "file://$PWD/$page" 2>/dev/null |
    sed -n 's/.*data-h="\([0-9]*\)".*/\1/p' | head -1)
  "$shell" "$@" --hide-scrollbars --window-size="$w,${h:-2000}" \
    --screenshot="$PWD/$name-$w.png" "file://$PWD/$page" >/dev/null 2>&1
  echo "$name-$w.png ${w}x${h:-2000}"
}
for w in 1440 390; do
  shot "playground.html?k=steps&rows=$([ "$w" = 390 ] && echo 16 || echo 28)" playground "$w"
  shot "states.html" states "$w"
  shot "kind-stat.html" kind-stat "$w"
done
