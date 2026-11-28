#!/bin/sh
set -eu
here=$(cd "$(dirname "$0")/.." && pwd)
t=$(mktemp -d)
trap 'rm -rf "$t"' EXIT
mkdir -p "$t/bin"
cat > "$t/bin/npm" <<'NPM'
#!/bin/sh
case "$*" in
"view @jirathip-dev/blocks@"*" version") cat "$FAKE/npm-has" 2>/dev/null || { echo "npm error code E404" >&2; exit 1; } ;;
"publish --access public --provenance") echo "npm $*" >> "$FAKE/calls" ;;
*) echo "fake npm: $*" >&2; exit 1 ;;
esac
NPM
cat > "$t/bin/cargo" <<'CARGO'
#!/bin/sh
case "$*" in
"publish -p blocks --locked" | "publish -p blocks-cli --locked") echo "cargo $*" >> "$FAKE/calls" ;;
*) echo "fake cargo: $*" >&2; exit 1 ;;
esac
CARGO
cat > "$t/bin/curl" <<'CURL'
#!/bin/sh
case "$*" in
"-sfL https://index.crates.io/bl/oc/blocks") cat "$FAKE/crate-blocks" 2>/dev/null || exit 22 ;;
"-sfL https://index.crates.io/bl/oc/blocks-cli") cat "$FAKE/crate-blocks-cli" 2>/dev/null || exit 22 ;;
*) echo "fake curl: $*" >&2; exit 1 ;;
esac
CURL
chmod +x "$t/bin/npm" "$t/bin/cargo" "$t/bin/curl"
run() {
  rm -f "$t/calls"
  printf '[workspace]\nmembers = ["crates/*"]\n\n[workspace.package]\nversion = "%s"\nedition = "2021"\n\n[workspace.lints.rust]\nversion = "9.9.9"\n' "$2" > "$t/Cargo.toml"
  printf '{\n  "name": "@jirathip-dev/blocks",\n  "version": "%s",\n  "type": "module"\n}\n' "$3" > "$t/package.json"
  (cd "$t" && FAKE="$t" PATH="$t/bin:$PATH" sh "$here/scripts/publish.sh" $1 > "$t/out.log" 2> "$t/err.log")
}
fail() { echo "$1" >&2; cat "$t/out.log" "$t/err.log" >&2; exit 1; }
rm -f "$t/npm-has" "$t/crate-blocks" "$t/crate-blocks-cli"
run v3.2 3.2.0 3.2.0 || fail "a fresh v3.2 failed"
want='npm publish --access public --provenance
cargo publish -p blocks --locked
cargo publish -p blocks-cli --locked'
test "$(cat "$t/calls")" = "$want" || fail "fresh v3.2 published: $(cat "$t/calls" 2>/dev/null)"
run v2.10 2.10.0 2.10.0 || fail "v2.10 is 2.10.0"
printf '3.2.0\n' > "$t/npm-has"
printf '{"name":"blocks","vers":"3.1.0"}\n{"name":"blocks","vers":"3.2.0"}\n' > "$t/crate-blocks"
printf '{"name":"blocks-cli","vers":"3.1.0"}\n' > "$t/crate-blocks-cli"
run v3.2 3.2.0 3.2.0 || fail "a partial publish failed"
test "$(cat "$t/calls")" = "cargo publish -p blocks-cli --locked" || fail "partial publish: $(cat "$t/calls" 2>/dev/null)"
grep -qx 'publish: @jirathip-dev/blocks@3.2.0 is on npm already' "$t/out.log" || fail "no npm no-op line"
grep -qx 'publish: blocks 3.2.0 is on crates.io already' "$t/out.log" || fail "no crates.io no-op line"
printf '{"name":"blocks-cli","vers":"3.2.0"}\n' > "$t/crate-blocks-cli"
run v3.2 3.2.0 3.2.0 || fail "an already-published v3.2 failed"
test ! -e "$t/calls" || fail "an already-published v3.2 published: $(cat "$t/calls")"
if run v3.2 3.1.0 3.2.0; then fail "a Cargo.toml at 3.1.0 published v3.2"; fi
test ! -e "$t/calls" || fail "a mismatch published: $(cat "$t/calls")"
grep -qx 'publish: v3.2 needs version 3.2.0; Cargo.toml has 3.1.0, package.json has 3.2.0' "$t/err.log" || fail "mismatch line"
if run v3.2 3.2.0 3.2.1; then fail "a package.json at 3.2.1 published v3.2"; fi
grep -qx 'publish: v3.2 needs version 3.2.0; Cargo.toml has 3.2.0, package.json has 3.2.1' "$t/err.log" || fail "npm mismatch line"
run --check 3.2.0 3.2.0 || fail "agreeing manifests failed the check"
test ! -e "$t/calls" || fail "the check published: $(cat "$t/calls")"
if run --check 3.2.0 3.1.0; then fail "disagreeing manifests passed the check"; fi
grep -qx 'publish: Cargo.toml has 3.2.0, package.json has 3.1.0: one version everywhere' "$t/err.log" || fail "disagree line"
echo "publish tests pass"
