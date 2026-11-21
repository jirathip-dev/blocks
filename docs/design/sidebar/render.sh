#!/bin/sh
# Renders each state light and dark with Playwright's cached headless Chromium, settled (reduced motion): the shell at 1440 (rail, open, pinned) and 390 (closed, swipe, drawer), the parts sheet at both widths, full height.
set -eu
cd "$(dirname "$0")"
shell=$(ls -d "$HOME"/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell | tail -1)
shot() {
  page=$1 state=$2 w=$3 h=$4 mode=$5 out=$6
  scheme=1; [ "$mode" = dark ] && scheme=0
  set -- --headless --allow-file-access-from-files --force-prefers-reduced-motion --blink-settings=preferredColorScheme=$scheme
  if [ "$h" = full ]; then
    h=$("$shell" "$@" --window-size="$w",800 --dump-dom "file://$PWD/$page.html" 2>/dev/null | sed -n 's/.*data-h="\([0-9]*\)".*/\1/p' | head -1)
  fi
  "$shell" "$@" --hide-scrollbars --window-size="$w,${h:-2000}" --screenshot="$PWD/$out" "file://$PWD/$page.html#$state" >/dev/null 2>&1
  echo "$out ${w}x$h"
}
for mode in light dark; do
  for s in rail open pinned; do shot shell "$s" 1440 900 "$mode" "shell-$s-$mode-1440.png"; done
  for s in closed swipe drawer; do shot shell "$s" 390 844 "$mode" "shell-$s-$mode-390.png"; done
  for w in 1440 390; do shot states "" "$w" full "$mode" "states-$mode-$w.png"; done
done
