#!/bin/sh
set -eu
: "${REPO:?}" "${SHA:?}"
v=$(sed -n 's/^pub const SCHEMA_VERSION: u8 = \([0-9]*\);$/\1/p' crates/blocks/src/lib.rs)
[ -n "$v" ] || { echo "release: no SCHEMA_VERSION in crates/blocks/src/lib.rs" >&2; exit 2; }
runs=$(gh api "repos/$REPO/actions/runs?head_sha=$SHA&event=push&per_page=100" \
  --jq '.workflow_runs[] | select(.name | IN("ci", "swift", "compat", "desktop", "egui-demo")) | "\(.name) \(.status) \(.conclusion)"')
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
prev=$(gh api "repos/$REPO/releases/latest" --jq .tag_name 2>/dev/null) || prev=
if [ -n "$prev" ]; then
  subjects=$(gh api --paginate "repos/$REPO/compare/$prev...$SHA?per_page=100" --jq '.commits[].commit.message | split("\n")[0]')
else
  subjects=$(gh api --paginate "repos/$REPO/commits?sha=$SHA&per_page=100" --jq '.[].commit.message | split("\n")[0]')
fi
nl='
'
apps=
list=
for n in $(printf '%s\n' "$subjects" | sed -n 's/.*(#\([0-9][0-9]*\))$/\1/p'); do
  pr=$(gh pr view "$n" -R "$REPO" --json title,body --jq '.title, .body' | tr -d '\r')
  title=$(printf '%s\n' "$pr" | head -n 1)
  humans=$(printf '%s\n' "$pr" | sed 1d | awk '/^## /{on=($0 ~ /^## For humans/); next} on && !/^For apps:/' | sed '/./,$!d')
  line=$(printf '%s\n' "$pr" | sed -n 's/^For apps: *//p' | head -n 1)
  list="$list$nl### #$n $title$nl$nl$humans$nl"
  if [ -n "$line" ]; then
    apps="$apps$nl- #$n $title: $line"
    list="$list${nl}For apps: $line$nl"
  fi
done
notes="blocks $tag @ $SHA$nl$nl## For apps$nl${apps:-${nl}Nothing to do: no pull request here changes what an app sees.}$nl$nl## Pull requests since ${prev:-the start}$nl${list:-${nl}none}"
gh release create "$tag" -R "$REPO" --target "$SHA" --title "$tag" --notes "$notes"
echo "release: published $tag"
