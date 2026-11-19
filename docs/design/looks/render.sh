#!/bin/sh
# Builds the real site into a temp folder, wears each look on it, then renders each page at 1440 and 390 wide, light and dark, settled (reduced motion), cut to the page's own height (the gallery to its first screens).
set -eu
cd "$(dirname "$0")"
out=$(mktemp -d)
cargo run -q -p blocks-site -- "$out"
node build.mjs "$out"
shell=$(ls -d "$HOME"/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell | tail -1)
flags() { echo "--headless --allow-file-access-from-files --force-prefers-reduced-motion --blink-settings=preferredColorScheme=$1 --hide-scrollbars"; }
shot() {
  p=$1 mode=$2 w=$3
  scheme=1; [ "$mode" = dark ] && scheme=0
  probe=".probe-$p.html"
  sed 's#</body>#<script>document.body.dataset.h=document.documentElement.scrollHeight</script></body>#' "$p.html" > "$probe"
  h=$("$shell" $(flags $scheme) --window-size="$w,800" --virtual-time-budget=2000 --dump-dom "file://$PWD/$probe" 2>/dev/null | grep -o 'data-h="[0-9]*"' | grep -o '[0-9]*')
  rm -f "$probe"
  case "$p" in gallery-*) cap=$((w == 390 ? 4000 : 2600)); [ "$h" -gt "$cap" ] && h=$cap ;; esac
  "$shell" $(flags $scheme) --window-size="$w,$h" --virtual-time-budget=2000 \
    --screenshot="$PWD/$p-$mode-$w.png" "file://$PWD/$p.html" >/dev/null 2>&1
  echo "$p-$mode-$w.png ($h)"
}
rm -f ./*.png
for look in default paper console playful; do
  for page in home gallery styles; do
    for mode in light dark; do
      shot $page-$look $mode 1440
      shot $page-$look $mode 390
    done
  done
done
