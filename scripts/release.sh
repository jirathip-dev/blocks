#!/bin/sh
set -eu
: "${REPO:?}" "${SHA:?}"
v=$(sed -n 's/^pub const SCHEMA_VERSION: u8 = \([0-9]*\);$/\1/p' crates/blocks/src/lib.rs)
[ -n "$v" ] || { echo "release: no SCHEMA_VERSION in crates/blocks/src/lib.rs" >&2; exit 2; }
runs=$(gh api "repos/$REPO/actions/runs?head_sha=$SHA&event=push&per_page=100" \
  --jq '.workflow_runs[] | select(.name | IN("ci", "web", "swift", "cap", "compat")) | "\(.name) \(.status) \(.conclusion)"')
echo "$runs" | grep -q '^ci completed success$' || { echo "release: ci is not green at $SHA yet; nothing published"; exit 0; }
if echo "$runs" | grep -v ' completed success$' | grep -q .; then
  echo "release: not every push workflow is green at $SHA; nothing published"
  echo "$runs"
  exit 0
fi
refs=$(gh api "repos/$REPO/git/matching-refs/tags/v$v." --jq '.[] | "\(.ref) \(.object.sha)"')
if echo "$refs" | grep -q " $SHA$"; then echo "release: $SHA is tagged already"; exit 0; fi
n=$(echo "$refs" | grep -c . || true)
tag="v$v.$n"
gh release create "$tag" -R "$REPO" --target "$SHA" --title "$tag" --notes "blocks $tag @ $SHA"
echo "release: published $tag"
