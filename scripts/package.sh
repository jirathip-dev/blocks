#!/bin/sh
set -eu
out=target/package
rm -rf "${out:?}"
mkdir -p "$out"
sh scripts/publish.sh --check
fit() {
  miss=0
  while IFS= read -r f; do
    ok=
    while IFS= read -r p; do case $f in $p) ok=1; break ;; esac; done < "$1"
    [ -n "$ok" ] || { echo "package: $3 holds $f, outside $1"; miss=1; }
  done < "$2"
  while IFS= read -r p; do
    hit=
    while IFS= read -r f; do case $f in $p) hit=1; break ;; esac; done < "$2"
    [ -n "$hit" ] || { echo "package: $3 misses $p from $1"; miss=1; }
  done < "$1"
  return "$miss"
}
bad=0
npm pack --dry-run --json --ignore-scripts > "$out/npm.json"
node -e 'for (const f of JSON.parse(require("node:fs").readFileSync(0, "utf8"))[0].files) console.log(f.path)' < "$out/npm.json" | sort > "$out/npm.txt"
fit ci/package/npm.txt "$out/npm.txt" "the npm tarball" || bad=1
for c in blocks blocks-cli; do
  cargo package --list --allow-dirty --locked -p "$c" | sort > "$out/$c.txt"
  fit "ci/package/$c.txt" "$out/$c.txt" "the $c crate" || bad=1
done
npm pack --silent --ignore-scripts --pack-destination "$out" > "$out/tgz"
tgz=$out/$(cat "$out/tgz")
npx --prefix web publint run "$tgz" --level error || bad=1
npx --prefix web attw "$tgz" --profile esm-only --exclude-entrypoints ./blocks.css || bad=1
exit "$bad"
