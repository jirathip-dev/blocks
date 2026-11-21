#!/bin/sh
# arch-check's generator. drover gives it 60 s, which a cold build in CI's core leg (no Rust cache) cannot meet,
# so there it restores the checked-out tree and the local/gen gate runs scripts/gen.sh in the cached local leg.
set -eu
cd "$(dirname "$0")/.."
if [ -n "${CI:-}" ] && [ "${LEG:-}" = core ]; then
  git checkout -q HEAD -- .
  exit 0
fi
exec sh scripts/gen.sh
