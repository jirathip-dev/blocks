#!/bin/sh
# Builds the real site into a temp folder, wears each look on it, then renders each page at 1440 and 390 wide, settled (reduced motion).
set -eu
cd "$(dirname "$0")"
out=$(mktemp -d)
cargo run -q -p blocks-site -- "$out"
node build.mjs "$out"
shell=$(ls -d "$HOME"/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell | tail -1)
shot() {
  page=$1 mode=$2 w=$3 h=$4
  scheme=1; [ "$mode" = dark ] && scheme=0
  "$shell" --headless --allow-file-access-from-files --force-prefers-reduced-motion --blink-settings=preferredColorScheme=$scheme \
    --hide-scrollbars --window-size="$w,$h" --virtual-time-budget=2000 \
    --screenshot="$PWD/$page-$mode-$w.png" "file://$PWD/$page.html" >/dev/null 2>&1
  echo "$page-$mode-$w.png"
}
for look in default paper console playful; do
  for mode in light dark; do
    shot home-$look $mode 1440 1500
    shot home-$look $mode 390 2600
  done
  shot gallery-$look light 1440 1700
  shot gallery-$look light 390 2400
done
shot styles-default light 1440 4300
shot styles-default light 390 7600
shot styles-console dark 1440 4300
shot styles-console dark 390 7600
