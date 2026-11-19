# What was measured, and how (#46)

Taken on 2026-11-19 at `d088209`, on the fleet's Mac (aarch64, macOS), with rustc 1.99.1, serde 1.0.229,
serde_json 1.0.154, node 24.22.2 and Playwright 1.63.0's WebKit. Sizes are bytes; gzip is level 9, brotli its default.

## The prototype

A scratch copy of the repo outside the worktree, never committed, with one added crate: a `cdylib` that depends on
`blocks` unchanged and exports the five modules with JSON text in and out (`design.md` has the surface). Built with:

```toml
[profile.wasm-z]
inherits = "release"   # codegen-units = 1
opt-level = "z"
lto = "fat"
panic = "abort"
strip = true
```

```sh
cargo build -p <the crate> --target wasm32-unknown-unknown --profile wasm-z
gzip -9c <out>.wasm | wc -c ; brotli -c <out>.wasm | wc -c
```

The exports were written by hand (`#[no_mangle]`, raw pointers), so the numbers are the core alone with no tool's
glue in it. That needs `unsafe`, which this repo forbids, so it is a measuring device only, not a design.

## Sizes

| Build | raw | gzip | brotli |
|---|---|---|---|
| `web/dist/blocks.js` today (rebuilt: byte-equal to the committed file) | 54,131 | 20,672 | 18,902 |
| the TS a core replaces: `Mirror`, `apply`, `evaluate`, `start`, `view`, bundled alone and minified | 6,794 | 2,771 | 2,554 |
| of it, `Mirror` and `apply` | 2,599 | 1,176 | 1,078 |
| of it, `evaluate`, `start`, `view` | 4,204 | 1,772 | 1,611 |
| **wasm, all five modules, `opt-level = "z"`** | **773,951** | **264,234** | **199,711** |
| the same, `opt-level = "s"` | 910,252 | 290,416 | 216,658 |
| the same, `opt-level = 3` | 1,841,095 | 521,988 | 280,521 |
| the same, parsing through `serde_json::Value` first | 720,613 | 250,796 | 190,393 |
| wasm, `mirror` and `patch` only | 678,320 | 218,449 | 163,092 |
| wasm, `mirror`, `patch` and `diff` | 708,128 | 229,845 | 171,853 |
| wasm, `eval`, `start` and `view` only | 165,366 | 74,053 | 63,587 |
| the same exports through `wasm-bindgen` 0.2.130's macro, before its CLI trims it | 793,496 | 271,291 | 204,597 |
| all five as base64 in a JS string | 1,031,947 | 356,687 | 265,561 |
| today's bundle with that string added | 1,086,078 | 377,694 | 284,389 |

The projected script: 20,672 less about 2,771, plus 264,234 as a second file, is about 282 KB before any glue;
"about 285 KB" in the ADR allows a few KB for it.

## The crate split

`site`, `theme`, `layout`, `tree`, `web` and `shelf` were compiled out of the crate (`cfg` on each `mod` line) and
the all-five build repeated: 773,072 bytes against 773,951. The linker already drops them.

## Where the bytes go

The unstripped build's code section, 726,754 bytes in 1,593 functions, grouped by symbol name (so to within a
few percent):

| Share | What |
|---|---|
| 55.7% | `Deserialize` for the crate's types: the 27 kinds, their parts, `Op`, `Frame`, `Synced` |
| 13.7% | `Serialize` for the same types |
| 13.7% | the crate's logic: `patch`, `diff`, `mirror`, `expr`, `behave`, and the export shim |
| 5.6% | `Clone` and `PartialEq` for the kinds |
| 11.3% | std, the allocator, serde_json's own code |

The largest single functions are `Block`'s two serializers (35 KB and 26 KB), `Op`'s deserializer (20 KB) and one
deserializer per kind (5 to 12 KB each).

## Same results

Both fixture folders ran through the wasm with the steps `web/test/protocol.test.ts` and `behave.test.ts` use:

```
protocol: 69 checks, 0 differ
behave: 62 cases, 0 differ
```

That includes the screens: what the typed core writes back equals the fixture's JSON, unknown fields and kinds kept.

## Speed

Headless WebKit, five fresh pages, the median with its range; the page clock ticks in whole milliseconds. The
screen is `web/test/shot.test.ts`'s 200 rows (15 KB of JSON); a frame merges one row, and the wasm side also
writes the whole screen back out and parses it, as the patcher would need.

| | TS | wasm |
|---|---|---|
| instantiate from bytes | | 2 ms (2 to 4) |
| the first screen taken | 0 ms (0 to 1) | 2 ms (2 to 4) |
| 120 frames, first pass on the page | 14 ms (14 to 15) | 19 ms (17 to 21) |
| 120 frames, second pass | 13 ms (12 to 14) | 12 ms (11 to 13) |

Not in these: downloading 264 KB instead of 2.8 KB on a cold load, and decoding base64 if inlined.

## Other facts checked

- The `wasm-bindgen` variant compiled under the workspace's lints (`unsafe_code = "forbid"` included). Clippy
  was not run on it.
- The stripped wasm still holds seven absolute host paths, all into cargo's registry (serde, serde_json).
- `sh scripts/line-cap.sh`: 13,336 of 13,500 non-test lines today.

## Not measured

- `wasm-opt`, and the `wasm-bindgen` CLI's output and JS glue: both are installs, which this lane may not make. The
  wasm target itself was not installed either: the build read the official `rust-std` 1.99.1 archive for
  `wasm32-unknown-unknown` (checksum verified) from a temp folder through `--sysroot`.
- A std rebuilt without panic text (`build-std`): nightly only; the repo pins stable.
- Whether a Mac and Linux CI produce the same wasm bytes: one host.
- `blocks-shot --check` and the 300 ms first-paint gate with the shell wired to the core: that is the build itself.

## To take them again

`rustup target add wasm32-unknown-unknown` (the owner's call on a shared host), add a `cdylib` crate exporting the
surface in `design.md`, build with the profile above, then gzip the `.wasm`. For the TS side:
`esbuild <entry re-exporting the five names> --bundle --format=esm --minify`.
