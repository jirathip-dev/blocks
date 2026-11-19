#!/bin/sh
# Builds the pages, then renders each at 1440 and 390 wide, full height, settled (reduced motion), light; home and the gallery also dark.
set -eu
cd "$(dirname "$0")"
node build.mjs
shell=$(ls -d "$HOME"/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell | tail -1)
shot() {
  page=$1 mode=$2 w=$3 name=$4
  scheme=1; [ "$mode" = dark ] && scheme=0
  set -- --headless --allow-file-access-from-files --force-prefers-reduced-motion --blink-settings=preferredColorScheme=$scheme
  h=$("$shell" "$@" --window-size="$w",800 --virtual-time-budget=2000 --dump-dom "file://$PWD/$page.html" 2>/dev/null |
    sed -n 's/.*data-h="\([0-9]*\)".*/\1/p' | head -1)
  [ "$page" = schemes-sheet ] && h=900
  "$shell" "$@" --hide-scrollbars --window-size="$w,${h:-2000}" --virtual-time-budget=2000 \
    --screenshot="$PWD/$name-$w.png" "file://$PWD/$page.html" >/dev/null 2>&1
  echo "$name-$w.png ${w}x${h:-2000}"
}
for w in 1440 390; do
  shot index light $w home
  shot index dark $w home-dark
  shot gallery light $w gallery
  shot gallery dark $w gallery-dark
  shot kind-stat light $w kind-stat
  shot schemes light $w schemes
  shot schemes-sheet light $w schemes-sheet
  shot numbers light $w numbers
  shot behaviours light $w behaviours
  shot islands light $w islands
done
