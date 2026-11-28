#!/bin/sh
set -eu
here=$(cd "$(dirname "$0")/.." && pwd)
t=$(mktemp -d)
trap 'rm -rf "$t"' EXIT
mkdir -p "$t/bin" "$t/crates/blocks/src"
printf 'pub const SCHEMA_VERSION: u8 = 3;\n' > "$t/crates/blocks/src/lib.rs"
cat > "$t/bin/gh" <<'GH'
#!/bin/sh
case "$*" in
*actions/runs*) cat "$FAKE/runs" ;;
*matching-refs*) cat "$FAKE/refs" ;;
*releases/latest*) cat "$FAKE/latest" 2>/dev/null || { echo '{"message":"Not Found","status":"404"}'; echo 'gh: Not Found (HTTP 404)' >&2; exit 1; } ;;
*compare/v3.1...abc*) cat "$FAKE/subjects" ;;
*commits\?sha=abc*) cat "$FAKE/subjects" 2>/dev/null || true ;;
"pr view "*) cat "$FAKE/pr-$3" ;;
"release create"*) echo "$*" >> "$FAKE/created" ;;
*) echo "fake gh: $*" >&2; exit 1 ;;
esac
GH
chmod +x "$t/bin/gh"
run() {
  printf '%b' "$1" > "$t/runs"
  printf '%b' "$2" > "$t/refs"
  rm -f "$t/created" "$t/latest" "$t/subjects"
  [ -z "${3:-}" ] || printf '%s\n' "$3" > "$t/latest"
  [ -z "${4:-}" ] || printf '%b' "$4" > "$t/subjects"
  printf '[workspace.package]\nversion = "%s"\n' "${ver:-3.0.0}" > "$t/Cargo.toml"
  printf '{\n  "version": "%s",\n}\n' "${npm:-${ver:-3.0.0}}" > "$t/package.json"
  (cd "$t" && FAKE="$t" PATH="$t/bin:$PATH" REPO=o/blocks SHA=abc sh "$here/scripts/release.sh" > "$t/out.log")
  cat "$t/created" 2>/dev/null || true
}
green='ci completed success\nswift completed success\ndesktop completed success\ncompat completed success\n'
got=$(run "$green" '' | head -n 1)
test "$got" = "release create v3.0 -R o/blocks --target abc --title v3.0 --notes blocks v3.0 @ abc" || { echo "first tag: got: $got" >&2; exit 1; }
ver=3.2.0
got=$(run "$green" 'refs/tags/v3.0 s0\nrefs/tags/v3.1 s1\n' | head -n 1)
test "$got" = "release create v3.2 -R o/blocks --target abc --title v3.2 --notes blocks v3.2 @ abc" || { echo "next tag: got: $got" >&2; exit 1; }
got=$(run "$green" 'refs/tags/v3.0 abc\n')
test -z "$got" || { echo "tagged twice: $got" >&2; exit 1; }
got=$(run 'ci completed success\nswift completed failure\n' '')
test -z "$got" || { echo "a red push published: $got" >&2; exit 1; }
got=$(run 'ci completed success\ncompat in_progress \n' '')
test -z "$got" || { echo "a pending push published: $got" >&2; exit 1; }
got=$(run 'ci completed failure\nswift completed success\n' '')
test -z "$got" || { echo "a red ci published: $got" >&2; exit 1; }
printf 'schema: a new field (#7)\r\n## Summary\r\nx\r\n\r\n## For humans\r\n\r\nScreens may carry a badge.\r\n\r\nFor apps: nothing to do, the field is optional.\r\n' > "$t/pr-7"
printf 'docs: a typo (#9)\n## For humans\n\nA typo is fixed.\n## Tests\nnone\n' > "$t/pr-9"
got=$(run "$green" 'refs/tags/v3.0 s0\nrefs/tags/v3.1 s1\n' v3.1 'schema: a new field (#7)\nMerge branch staging\ndocs: a typo (#8) (#9)\n')
want='release create v3.2 -R o/blocks --target abc --title v3.2 --notes blocks v3.2 @ abc

## For apps

- #7 schema: a new field (#7): nothing to do, the field is optional.

## Pull requests since v3.1

### #7 schema: a new field (#7)

Screens may carry a badge.

For apps: nothing to do, the field is optional.

### #9 docs: a typo (#9)

A typo is fixed.'
test "$got" = "$want" || { printf 'notes: got:\n%s\n' "$got" >&2; exit 1; }
ver=3.0.0
got=$(run "$green" '' '' 'schema: a new field (#7)\nMerge branch staging\n')
want='release create v3.0 -R o/blocks --target abc --title v3.0 --notes blocks v3.0 @ abc

## For apps

- #7 schema: a new field (#7): nothing to do, the field is optional.

## Pull requests since the start

### #7 schema: a new field (#7)

Screens may carry a badge.

For apps: nothing to do, the field is optional.'
test "$got" = "$want" || { printf 'no latest release: got:\n%s\n' "$got" >&2; exit 1; }
ver=3.2.0 npm=3.1.0
if got=$(run "$green" 'refs/tags/v3.0 s0\nrefs/tags/v3.1 s1\n' 2> "$t/err.log"); then echo "a version mismatch tagged: $got" >&2; exit 1; fi
test ! -e "$t/created" || { echo "a version mismatch made a release" >&2; exit 1; }
grep -qx 'publish: v3.2 needs version 3.2.0; Cargo.toml has 3.2.0, package.json has 3.1.0' "$t/err.log" || { echo "mismatch line: $(cat "$t/err.log")" >&2; exit 1; }
echo "release tests pass"
