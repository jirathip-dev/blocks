# Verify recipe: blocks

This repo's app is its renderers. A verify lane draws the fixtures with the HTML harness, `blocks-shot` (WebKit),
and looks at the PNGs. No server, no browser of its own, no network.

1. Setup: `npm --prefix web ci --no-audit --no-fund`, then `just gen` (rebuilds `web/dist`, the generated
   fixtures and `fixtures/trees`). WebKit comes from Playwright's cache (`npx --prefix web playwright install webkit`
   if it is missing; ask the owner before installing on a shared host).
2. Every fixture, checked, at both sizes:
   ```sh
   for f in fixtures/blocks/*.json; do k=$(basename "$f" .json)
     for s in 1440x900 390x844; do
       npm --prefix web run -s shot -- --screen "$PWD/$f" --expect "$PWD/fixtures/trees/$k.json" --check \
         --size "$s" --out "$PWD/shots/${s%%x*}/$k" || echo "FAIL $k $s"
     done
   done
   ```
   PASS needs no `FAIL` line: each block drawn natively or as its fallback as `fixtures/trees` says, with a size,
   inside the width and over no sibling.
3. A changed kind or screen: run its fixture (or the PR's own screen file) with `--script steps.json`, steps as in
   `docs/architecture/blocks/usage.md` (`tap`, `type`, `scroll`, `frame`, `answer`, `shot`); `report.json`'s `sent`
   holds the actions it posted.
4. Screenshots for `verdict.md`: `shots/1440/<kind>/<kind>.png` and `shots/390/<kind>/<kind>.png` of each kind the
   PR touches. A visual change the issue did not ask for is a FAIL.
