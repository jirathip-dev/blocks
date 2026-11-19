#!/bin/sh
# Renders each page at 1440 and 390 wide, full height, with Playwright's cached headless Chromium.
set -eu
cd "$(dirname "$0")"
shell=$(ls -d "$HOME"/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell | tail -1)
for page in composer content looks; do
  for w in 1440 390; do
    h=$("$shell" --headless --window-size="$w",800 --dump-dom "file://$PWD/$page.html" 2>/dev/null |
      sed -n 's/.*data-h="\([0-9]*\)".*/\1/p' | head -1)
    "$shell" --headless --hide-scrollbars --window-size="$w,${h:-2000}" \
      --screenshot="$PWD/$page-$w.png" "file://$PWD/$page.html" >/dev/null 2>&1
    echo "$page-$w.png ${w}x$h"
  done
done
