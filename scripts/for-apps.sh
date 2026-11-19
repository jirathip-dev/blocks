#!/bin/sh
set -eu
body=${1:?usage: for-apps.sh <pr-body-file> < changed-paths}
list="$(cd "$(dirname "$0")/.." && pwd)/ci/for-apps.paths"
hit=
while IFS= read -r f; do
  while IFS= read -r p; do
    case $f in $p) hit=$f; break 2 ;; esac
  done < "$list"
done
[ -n "$hit" ] || { echo "for-apps: no path in ci/for-apps.paths changed; no line needed"; exit 0; }
tr -d '\r' < "$body" | grep -q '^For apps: *[^ ]' || {
  echo "for-apps: $hit changes what an app sees (ci/for-apps.paths): add a 'For apps: <what an app has to do, or nothing to do and why>' line to the PR body" >&2
  exit 1
}
echo "for-apps: $hit changes what an app sees; the PR body carries its For apps line"
