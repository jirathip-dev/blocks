#!/bin/sh
# Renders each page light and dark at 1440 and 390 wide, full height, settled (reduced motion), with Playwright's cached headless Chromium.
set -eu
cd "$(dirname "$0")"
shell=$(ls -d "$HOME"/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell | tail -1)
for page in proof states static; do
  for mode in light dark; do
    scheme=1; [ "$mode" = dark ] && scheme=0
    for w in 1440 390; do
      set -- --headless --allow-file-access-from-files --force-prefers-reduced-motion --blink-settings=preferredColorScheme=$scheme
      h=$("$shell" "$@" --window-size="$w",800 --dump-dom "file://$PWD/$page.html" 2>/dev/null |
        sed -n 's/.*data-h="\([0-9]*\)".*/\1/p' | head -1)
      "$shell" "$@" --hide-scrollbars --window-size="$w,${h:-2000}" \
        --screenshot="$PWD/$page-$mode-$w.png" "file://$PWD/$page.html" >/dev/null 2>&1
      echo "$page-$mode-$w.png ${w}x$h"
    done
  done
done
