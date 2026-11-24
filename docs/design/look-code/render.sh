#!/bin/sh
# Builds the real site from HEAD, writes the preview pages over it, and renders each at 1440 and 390 wide, settled (reduced motion).
set -eu
cd "$(dirname "$0")"
here=$PWD
root=$(git rev-parse --show-toplevel)
out=$(mktemp -d)
(cd "$root" && cargo run -q -p blocks-site -- "$out")
rm -rf media
cp -R "$out/media" media
cp "$out/blocks.css" "$out/blocks.js" "$out/site.css" .
node build.mjs "$out" "$root"
shell=$(ls -d "$HOME"/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell | tail -1)
shot() {
  file=$1 name=$2 mode=$3 w=$4 h=$5
  scheme=1; [ "$mode" = dark ] && scheme=0
  "$shell" --headless --allow-file-access-from-files --force-prefers-reduced-motion --blink-settings=preferredColorScheme=$scheme \
    --hide-scrollbars --window-size="$w,$h" --virtual-time-budget=3000 --user-data-dir="$(mktemp -d)" \
    --screenshot="$here/$name-$w.png" "file://$here/$file.html" >/dev/null 2>&1
  echo "$name-$w.png"
}
shot styles-default styles-default light 1440 1500
shot styles-default styles-default light 390 2000
shot styles-console styles-console dark 1440 1500
shot styles-console styles-console dark 390 2000
shot shared shared light 1440 1100
shot shared shared light 390 1300
shot format format light 1440 2900
shot format format light 390 4300
