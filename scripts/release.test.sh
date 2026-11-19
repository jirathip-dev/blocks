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
"release create"*) echo "$*" >> "$FAKE/created" ;;
*) echo "fake gh: $*" >&2; exit 1 ;;
esac
GH
chmod +x "$t/bin/gh"
run() {
  printf '%b' "$1" > "$t/runs"
  printf '%b' "$2" > "$t/refs"
  rm -f "$t/created"
  (cd "$t" && FAKE="$t" PATH="$t/bin:$PATH" REPO=o/blocks SHA=abc sh "$here/scripts/release.sh" > "$t/out.log")
  cat "$t/created" 2>/dev/null || true
}
green='ci completed success\nweb completed success\ncap completed success\ncompat completed success\n'
got=$(run "$green" '')
test "$got" = "release create v3.0 -R o/blocks --target abc --title v3.0 --notes blocks v3.0 @ abc" || { echo "first tag: got: $got" >&2; exit 1; }
got=$(run "$green" 'refs/tags/v3.0 s0\nrefs/tags/v3.1 s1\n')
test "$got" = "release create v3.2 -R o/blocks --target abc --title v3.2 --notes blocks v3.2 @ abc" || { echo "next tag: got: $got" >&2; exit 1; }
got=$(run "$green" 'refs/tags/v3.0 abc\n')
test -z "$got" || { echo "tagged twice: $got" >&2; exit 1; }
got=$(run 'ci completed success\nweb completed failure\n' '')
test -z "$got" || { echo "a red push published: $got" >&2; exit 1; }
got=$(run 'ci completed success\ncompat in_progress \n' '')
test -z "$got" || { echo "a pending push published: $got" >&2; exit 1; }
got=$(run 'ci completed failure\nweb completed success\n' '')
test -z "$got" || { echo "a red ci published: $got" >&2; exit 1; }
echo "release tests pass"
