#!/bin/sh
set -eu
check=
if [ "${1:-}" = --check ]; then check=1; shift; fi
tag=${1:-}
cargo_v=$(sed -n '/^\[workspace\.package\]/,/^\[/s/^version = "\(.*\)"$/\1/p' Cargo.toml)
npm_v=$(sed -n 's/^  "version": "\(.*\)",$/\1/p' package.json)
if [ -z "$tag" ]; then
  [ -n "$check" ] || { echo "usage: publish.sh [--check] [v<S>.<n>]" >&2; exit 2; }
  [ -n "$cargo_v" ] && [ "$cargo_v" = "$npm_v" ] || { echo "publish: Cargo.toml has ${cargo_v:-no version}, package.json has ${npm_v:-no version}: one version everywhere" >&2; exit 1; }
  echo "publish: Cargo.toml and package.json carry $cargo_v"
  exit 0
fi
case $tag in
v[0-9]*.[0-9]*) want=${tag#v}.0 ;;
*) echo "publish: $tag is no v<S>.<n> tag" >&2; exit 2 ;;
esac
if [ "$cargo_v" != "$want" ] || [ "$npm_v" != "$want" ]; then
  echo "publish: $tag needs version $want; Cargo.toml has ${cargo_v:-no version}, package.json has ${npm_v:-no version}" >&2
  exit 1
fi
[ -z "$check" ] || exit 0
name=$(sed -n 's/^  "name": "\(.*\)",$/\1/p' package.json)
if [ "$(npm view "$name@$want" version 2>/dev/null || true)" = "$want" ]; then
  echo "publish: $name@$want is on npm already"
else
  npm publish --access public --provenance
fi
for c in blocks blocks-cli; do
  if curl -sfL "https://index.crates.io/$(printf %s "$c" | cut -c1-2)/$(printf %s "$c" | cut -c3-4)/$c" | grep -q "\"vers\":\"$want\""; then
    echo "publish: $c $want is on crates.io already"
  else
    cargo publish -p "$c" --locked
  fi
done
echo "publish: $tag done"
