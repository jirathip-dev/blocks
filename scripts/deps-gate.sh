#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
allowed=$(grep -oE '^- `[a-z0-9_-]+`' docs/deps.md | tr -d '`- ' | paste -sd'|' -)
test -n "$allowed" || { echo "::error::no allow-list in docs/deps.md"; exit 1; }
direct=$(for f in Cargo.toml crates/*/Cargo.toml; do
  sed -n '/^\[\(workspace\.\)\{0,1\}\(dev-\|build-\)\{0,1\}dependencies\]/,/^\[/p' "$f"
done | grep -oE '^[a-z0-9_-]+' | sort -u)
extra=$(grep -vxE "$allowed" <<<"$direct" || true)
test -z "$extra" || { echo "::error::direct dependencies not in docs/deps.md: $extra"; exit 1; }
echo "deps gate: $(wc -l <<<"$direct" | tr -d ' ') direct dependencies, all in docs/deps.md"
