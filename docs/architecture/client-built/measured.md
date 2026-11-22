# What was built and run, and how (#354)

Taken on 2026-11-22 at staging 73adae31 (38 kinds), on the fleet's Mac (aarch64, macOS), with rustc 1.99.1, serde
1.0.229, serde_json 1.0.154 and node 24.22.2. Sizes are bytes; gzip is level 9, brotli 1.2.1 at its default.

Nothing was installed. As in #46, the two targets' standard libraries were read through `--sysroot` from the
official `rust-std` 1.99.1 archives, whose sha256 match the published ones. Everything was built in a scratch
folder outside the worktree and is not committed; `usage.md` sections 1 and 2 are the prototype's source.

## The crate on both targets

```sh
cargo build --locked -p blocks --lib --target wasm32-unknown-unknown   # exit 0
cargo build --locked -p blocks --lib --target aarch64-apple-ios        # exit 0
```

The crate as it is, default features, no source change.

## The example's wasm

The crate of `usage.md` (the app, 34 lines; the glue, 44 lines; `crate-type = ["cdylib"]`), built with
`opt-level = "z"`, `codegen-units = 1`, `panic = "abort"`, `strip = true`:

| Build | raw | gzip | brotli |
|---|---|---|---|
| **the example, `lto = "thin"`: the profile it ships with** | **1,334,885** | **297,161** | **217,733** |
| the example, `lto = "fat"`, #46's profile | 1,123,386 | 357,575 | 259,597 |
| the example with `diff`'s self-check compiled out, thin | 468,233 | 125,010 | 100,858 |
| the same, fat | 403,817 | 127,341 | 101,711 |

Thin is 17% less to download than fat and 19% larger unpacked; with the check out the two are level. The app
picks its own profile.

Variants, all `lto = "fat"`, with the whole screen written through `Built::of`. The first, fourth and fifth rows
used the raw-pointer exports of the third:

| Build | raw | gzip | brotli |
|---|---|---|---|
| builders and the screen's JSON only: no `diff`, no action | 403,142 | 146,339 | 119,046 |
| with `diff` and the action read: the example's glue | 1,229,600 | 407,452 | 299,655 |
| the same through hand-written raw-pointer exports (`unsafe`) | 1,230,798 | 408,097 | 299,630 |
| with `diff` and `Built::check` | 1,262,674 | 420,636 | 309,172 |
| `Built::check` and no `diff` | 1,064,863 | 360,787 | 261,768 |
| the example's glue, crate declared `["cdylib", "rlib"]` | 1,456,570 | 329,220 | 240,222 |
| for reference, #46's core at d088209 (27 kinds, five modules) | 773,951 | 264,234 | 199,711 |

What the rows say:

- The safe glue costs nothing: 1,229,600 against 1,230,798 with raw pointers.
- Writing the typed block (`serde_json::to_string(&Block)`, as the stream does) is 106 KB smaller than going
  through `Built::of`, and gives whole screens and ops the same form.
- `Built::check` alone brings 660 KB: it parses the typed kinds. In the wasm it is nearly free only because `diff`
  has already paid for that parse. It belongs in native tests.
- A crate that is both `cdylib` and `rlib` came out like `lto = "off"` (1,441,240 raw, 334,790 gzipped): the
  example is `cdylib` only and keeps its tests inside the lib.

## Where the bytes go

`diff` proves its ops before it returns them: it applies them to a copy of the old screen and compares
(`diff.rs`, `applies`). Applying a `merge` writes the block to JSON, adds the fields and parses the block back
(`patch.rs`, `merge`, the one `serde_json::from_value` on that path). That parse is generic over `Block`, so it
brings the reader of every kind. The other ops (insert, move, remove, replace, append) parse nothing.

Compiling the check out is the fourth row of the first table: 1,334,885 to 468,233 raw, 297,161 to 125,010
gzipped. So about 58% of the download is the typed parse behind one check. This is #46's finding again (56% of
that wasm was `Deserialize` for the kinds), reached by another road.

That row is a floor, not a design: `diff` leans on the check to fall back to `replace` or to the whole screen, so
it cannot simply go. A check that compares the two blocks' JSON values, which `diff` already has in hand, would
need no parse; what it costs and whether the sim still passes is the follow-up's to measure.

## The glue, run

The `lto = "fat"` build in node, through the `call` of `usage.md` section 3:

```text
exports: memory act screen text text_at text_len
screen: {"type":"screen","id":"meter","title":"Meter","blocks":[{"type":"stat","id":"count","label":"sent","value":0},{"type":"list","id":"sends","rows":[]},{"type":"button","id":"send","label":"Send one","action":"send"}]}
answer 1: {"ops":[{"op":"insert","into":"sends","block":{"type":"row","id":"send-0","title":"Send 0"}},{"op":"merge","id":"count","fields":{"value":1}}]}
answer 2: {"ops":[{"op":"insert","into":"sends","block":{"type":"row","id":"send-1","title":"Send 1"}},{"op":"merge","id":"count","fields":{"value":2}}]}
bad: {}
```

Exit 0. `grep -c unsafe` on both source files: 0. "bad" is `act` handed text that is no action.

## Not measured

- **The TS seam and the page in WebKit.** No TS was written: `Source`, `local` and the change to `mount.ts` are
  designed from reading `mount.ts`, `stream.ts` and `core/apply.ts`. The line count (about 90 counted lines) and
  the bundle growth (under 1 KB) are estimates.
- **The iOS build on CI's Linux runner.** It was built on macOS. A library build links nothing, so Linux should
  do; if it does not, that one line moves to a gate on the `swift` leg.
- **`wasm-opt`.** An install. #46 put its gain, together with a rebuilt std, at 15 to 30%, an estimate.
- **An iOS binary's size.** A static library carries all of std until the app links it; the number that matters
  is the app's.
- **Speed.** #46 timed the crate through wasm at 2 ms to take a 200-row screen; not repeated.
