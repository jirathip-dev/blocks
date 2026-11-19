#!/bin/sh
# Builds the real site from a copy of HEAD with proposal/looks.json and proposal/site.css in place of site/'s, then renders home, gallery and styles in each look at 1440 and 390 wide, settled (reduced motion).
set -eu
cd "$(dirname "$0")"
here=$PWD
root=$(git rev-parse --show-toplevel)
src=$(mktemp -d)
out=$(mktemp -d)
git -C "$root" archive HEAD | tar -x -C "$src"
cp proposal/looks.json "$src/site/looks.json"
cp proposal/site.css "$src/site/site.css"
(cd "$src" && CARGO_TARGET_DIR="$root/target" cargo run -q -p blocks-site -- "$out")
rm -rf media pages *.html
cp -R "$out/media" media
cp "$out/blocks.css" "$out/blocks.js" "$out/site.css" .
for look in default paper console playful; do
  for page in index gallery styles; do
    name=$page; [ "$page" = index ] && name=home
    sed "s#<head>#<head><script>localStorage.setItem('b:look','$look')</script>#" "$out/$page.html" > "$name-$look.html"
  done
done
shell=$(ls -d "$HOME"/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell | tail -1)
shot() {
  file=$1 name=$2 mode=$3 w=$4 h=$5
  scheme=1; [ "$mode" = dark ] && scheme=0
  "$shell" --headless --allow-file-access-from-files --force-prefers-reduced-motion --blink-settings=preferredColorScheme=$scheme \
    --hide-scrollbars --window-size="$w,$h" --virtual-time-budget=3000 --user-data-dir="$(mktemp -d)" \
    --screenshot="$here/$name-$mode-$w.png" "file://$here/$file.html" >/dev/null 2>&1
  echo "$name-$mode-$w.png"
}
for look in ${LOOKS:-default paper console playful}; do
  for mode in light dark; do
    shot home-$look home-$look $mode 1440 1500
    shot home-$look home-$look $mode 390 2600
  done
  shot gallery-$look gallery-$look light 1440 1700
  shot gallery-$look gallery-$look light 390 2400
  shot styles-$look styles-$look light 1440 4400
  shot styles-$look styles-$look light 390 7800
done
