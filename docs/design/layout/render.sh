#!/bin/sh
# Builds the page, then renders it at 1440 and 390 wide, full height, settled (reduced motion): each size class, dark and paper.
set -eu
cd "$(dirname "$0")"
node build.mjs
shell=$(ls -d "$HOME"/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell | tail -1)
shot() {
  query=$1 mode=$2 w=$3 name=$4
  scheme=1; [ "$mode" = dark ] && scheme=0
  set -- --headless --allow-file-access-from-files --force-prefers-reduced-motion --blink-settings=preferredColorScheme=$scheme
  url="file://$PWD/layout.html?$query"
  h=$("$shell" "$@" --window-size="$w",800 --virtual-time-budget=2000 --dump-dom "$url" 2>/dev/null |
    sed -n 's/.*data-h="\([0-9]*\)".*/\1/p' | head -1)
  "$shell" "$@" --hide-scrollbars --window-size="$w,${h:-2000}" --virtual-time-budget=2000 \
    --screenshot="$PWD/$name-$w.png" "$url" >/dev/null 2>&1
  echo "$name-$w.png ${w}x${h:-2000}"
}
for w in 1440 390; do
  shot size=wide light $w wide
  shot size=compact light $w compact
  shot size=wide dark $w wide-dark
  shot "size=compact&look=paper" light $w compact-paper
done
