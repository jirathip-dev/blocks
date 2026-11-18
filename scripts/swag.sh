#!/bin/sh
# Vendors jirathip-dev/swag's packs/ at one commit into theme/packs/, with SOURCE and SHA256SUMS.
set -eu
sha="${1:?usage: scripts/swag.sh <swag commit sha>}"
out="$(dirname "$0")/../theme/packs"
mkdir -p "$out"
for pack in farm garden kitchen; do
    mkdir -p "$out/$pack"
    for f in theme.json sprites.svg scene.svg icon.png; do
        gh api -H "Accept: application/vnd.github.raw" "repos/jirathip-dev/swag/contents/packs/$pack/$f?ref=$sha" > "$out/$pack/$f"
    done
done
printf 'https://github.com/jirathip-dev/swag %s\n' "$sha" > "$out/SOURCE"
(cd "$out" && shasum -a 256 */theme.json */sprites.svg */scene.svg */icon.png > SHA256SUMS)
