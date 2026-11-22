# ADR: client-built screens from the app's own Rust (#354)

## Summary

Decision: the crate needs no change: it builds for wasm32 and iOS as it is, with no feature. The web shell gets one
seam, a source: `mount` draws a server's stream or the app's own code the same way. BlocksUI already takes a screen
and gives actions back, so it gets a test, no new code. The example is a small Rust app with no new dependency.
Slices: one PR: two CI gates, the web source seam, the example (`demo/client`), the Swift test, one docs page.
Open questions: the example's wasm is 297 KB gzipped and 172 KB of that is one check inside `diff`. File a
follow-up that slims the check (floor measured: 125 KB)? Recommended: yes, as its own issue.

## Question

Sendmeter builds its screens in its own Rust, inside the app: as wasm in a browser page, natively behind its FFI
on iOS. How does that Rust hand a screen and then ops to the HTML renderer and to BlocksUI with no server and no
stream, how do actions come back, what does the wasm cost, and what is left to the app?

Two notes from the owner bind the answer (decided in q3036, asked into the issue's amendments by q3061): one
renderer entry point whether ops come from local code or from the stream; and the wasm holds kinds, builders and
`diff`, nothing more.

This does not reopen #46. That ADR refused to replace blocks' own 2.8 KB of TS with a wasm core. Here the wasm is
the app's: it exists anyway, and blocks is a library inside it.

## What exists, read from the code (staging 73adae31)

- **The crate is already portable.** Its default build is serde and serde_json over pure code: `arch.toml` bans
  files, clocks, processes and sockets outside codegen and the CLI, and codegen sits behind the `schema` feature.
  It compiled for both targets unchanged (`measured.md`).
- **The web shell is welded to a server in two places**, both in `web/src/shell/mount.ts`: `stream({ url })` to
  read a screen, and `fetch(url(source, "/action"))` to send an action. Everything after them (the patcher,
  toasts, sheets, back, confirm) only needs "a screen, then ops" and "an answer".
- **`stream()` already returns the right shape**: `open(key, on)` and `close(key)`, where `on(screen, ops?)`
  gets the whole screen or the ops that made it. The seam is there; it has no name.
- **BlocksUI never knew a stream.** `BlocksView(block, source:, act:)` takes a `Block` and a closure. drover's and
  cooee's apps do their own transport and call `Block.apply(ops)`. `Action` and `Answer` are generated Codable types.
- **`diff` checks itself with a typed parse.** It applies its ops to a copy and compares; applying a `merge`
  parses the block back from JSON, which brings the reader of every kind into the binary.
- **Mode B exists in TS** (#81): builders in a route loader, the React adapter, a new whole screen each time, no ops.
- **`demo/egui` is the precedent for an example**: a crate outside the workspace with its own lock file.

## What was measured

| | raw | gzipped |
|---|---|---|
| the crate for wasm32-unknown-unknown and aarch64-apple-ios | builds, exit 0 | |
| the example's wasm: builders, `diff`, an action in, an answer out | 1,335 KB | 297 KB |
| the same with `diff`'s self-check compiled out (a floor, not a design) | 468 KB | 125 KB |
| builders and the screen's JSON only, no `diff` | 403 KB | 146 KB |
| `web/dist/blocks.js` today, for scale | 183 KB | 67 KB |

The example ran in node: a screen out, an action in, the right ops back. `measured.md` has every number, the
build settings of each row and what was not measured (the TS seam is designed from the code, not built).

## Options

### How local code reaches the HTML renderer

| | Option | Verdict |
|---|---|---|
| A | a second entry beside `mount`: `draw(element, screen)` with `ops()` and an `onAction` | no: toasts, sheets, back and confirm would be written twice or missing, and the owner asked for one entry |
| B | **`mount` reads through a source; a source is a server or the app's code** | **chosen**: about 90 lines, `stream.ts` untouched, drover and cooee unchanged |
| C | the app's wasm speaks the stream protocol: a `Shelf` in the wasm, frames to a `Mirror` in the page | no: it puts shelf, frames and their parse in the wasm against the owner's second note, to solve ordering a local call already has |
| D | no ops: the app hands a whole screen each time, as Mode B in TS does | no: the HTML shell redraws a whole screen, losing focus and typed text (#81 found the same); the issue asks for ops |

### Who holds the screen and applies the ops in the page

| | Option | Verdict |
|---|---|---|
| A | the app's glue: it keeps the model, calls `apply`, hands screen and ops | no: every app rewrites the gap rule, and a slip shows as a stale page |
| B | **`local()` in blocks: the app answers `screen` and `act`, blocks holds the screen** | **chosen**: the app's glue is two functions; ops that do not fit heal by asking `screen` again |

### BlocksUI

| | Option | Verdict |
|---|---|---|
| A | a new holder type in `Blocks` (JSON in, ops in, a block out) | no: it wraps three lines the generated types already give, and adds a second way to do what apps do today |
| B | **nothing new: `BlocksView`, `Block.apply`, `Action`, `Answer`** | **chosen**: a test on the example's fixtures proves it and the docs show it |

### The example's wasm glue

| | Option | Verdict |
|---|---|---|
| A | `wasm-bindgen`, in the workspace | no: a new dependency and a CLI pinned to it, for 44 lines; an app may still choose it in its own repo |
| B | hand-written exports with raw pointers | no: `unsafe`, which the repo forbids |
| C | **five exports over one text buffer the Rust owns, in `demo/client` outside the workspace** | **chosen**: no dependency, no `unsafe` block, built and run for this ADR |

C's one cost, said plainly: `#[no_mangle]` itself is refused by the workspace's `unsafe_code = "forbid"`, so the
example cannot be a workspace member. `demo/egui` stands outside it too, for the window toolkit the workspace bans.

### The crate

| | Option | Verdict |
|---|---|---|
| A | a `wasm` or `lean` cargo feature, or a split crate | no: nothing to switch. #46 measured a split at 0.1%; the linker already drops what the exports do not reach |
| B | **no feature: the default build** | **chosen** |
| C | slim `diff`'s check now, in this PR | no: it changes what Mode A runs on every frame and wants its own measurement and the sim. It is the open question |

## Decision

1. **The crate does not change.** No feature, no split, no new public item. A client-built app uses the kinds'
   builders, `serde_json::to_string(&Block)`, `diff`, `Action` and `Answer`. A new gate, `targets`, builds the
   default lib for `wasm32-unknown-unknown` and `aarch64-apple-ios` in CI, so the next file read or clock in the
   default build fails there.
2. **One web entry point: `mount`.** It reads every screen and sends every action through a `Source`: `open`,
   `close`, `act`. `served` wraps today's stream and POST, unchanged in behaviour; `mount({ url })` uses it for
   every source not named in the new `sources` field. `adopt` is not touched.
3. **`local({ screen, act })` makes a `Source` from the app's code.** It holds each open path's screen, applies
   ops with the core's `apply`, and asks `screen` again when ops do not fit. `push(path, ops)` takes ops no action
   asked for.
4. **Actions come back as a server's do.** The shell calls `act` with the wire's `Action`; the app returns the
   wire's `Answer`. Its ops patch the page in place; its `toast`, `open` and `close` work as today. A thrown error
   is a failed action and shows as a bad toast.
5. **BlocksUI gets no new API.** The app decodes a `Block`, hands it to `BlocksView` with an `act` closure, turns
   each `BlockAction` into an `Action` for its FFI, and calls `Block.apply` with the answer's ops.
6. **The example is `demo/client`**: a meter in 34 lines of Rust, five exports in 44 more, a page of about 25
   lines. Its native test writes `fixtures/client/`; the WebKit test and the Swift test read them, so all three
   draw the same screen and the same ops.
7. **The size is stated and held.** 297 KB gzipped with the example's profile. The `client` gate fails over
   375,000 bytes gzipped. `Built::check` stays in native tests: on its own it brings the same typed parse.
8. **CI is two gate files**, `targets` and `client`, in `.gatekeeper/gates/`. Both run in CI only, as the Swift
   gates do: a lane's host has neither target and no install is asked of it. The Swift test rides `swift-test`.
9. **The docs are one page**, `docs/client-built.md`: the mode, the two entry points, the glue's contract, the
   sizes, what stays the app's job. `README.md`'s Mode B sentence and `docs/consume.md` point at it.

## What stays the app's job

- Its Rust: the state, the screens, what each action does, and remembering the screen it last handed out per path.
- Its wasm glue and loader: the exports (the example's, or `wasm-bindgen`), fetching and starting the `.wasm`, a
  worker if it wants one, and `wasm-unsafe-eval` in its CSP.
- Its iOS FFI: UniFFI, swift-bridge or a C header, and the threads behind it.
- Its build profile and its own size budget. blocks states what its part costs; the app's own code comes on top.
- Its own kinds: the lit board and its mascot stay app kinds or islands, registered as today (`blocks` in
  `mount`, `.appBlocks` in SwiftUI).
- One pin for the crate, the npm package and the Swift package, with its test that they agree, as today.

## Consequences

- **drover and cooee: nothing to do.** `mount({ url })`, the stream, the POST body and `adopt` behave as today;
  `blocks-shot --check`, the protocol fixtures and `shell.test.ts` hold that. The PR's line: "For apps: nothing to
  do. `mount` takes `sources`; `local` makes one from your own code."
- **No new dependency**, so no ask: none in the crate, the npm package or the Swift package. `demo/client` depends
  on `blocks` and `serde_json` only. WebKit for the page test is the Playwright `web/` already pins.
- **About 90 counted lines**, all in `web/src/shell/`. The cap stands at 22,095 of 44,000. No cap ask.
- **The owner's two notes are met**: one entry point per renderer, and the wasm holds kinds, builders and `diff`.
- **The README's Mode B sentence changes**: Mode B is built in TS (React) or in the app's Rust (the HTML shell and
  SwiftUI).
- **The React adapter needs nothing**: it already takes a screen and `onAction`. An app with a Rust core and a
  React page hands it whole screens; ops into React are not part of this issue.
- **A new kind grows the example's wasm** by its reader and writer. The ceiling leaves room for about ten more,
  an estimate; past it, the choice is the follow-up below or a raise in its own issue.
- **#46 stands.** Its finding is the same one: the typed parse of the kinds is the cost.

## Open question for the owner

1. **Slim `diff`'s self-check?** Today 58% of the example's download exists so that `diff` can re-parse a merged
   block to prove its own ops. A check that compares the two blocks' JSON values would need no parse; with the
   check compiled out the wasm is 125 KB gzipped instead of 297 KB. It touches `diff.rs` and `patch.rs`, which
   Mode A runs on every frame, so it wants its own issue: the design, the sim's seeds, the perf budgets, then the
   example's ceiling lowered to what it measures. Recommended: yes, filed after this one merges; this issue
   does not wait for it.

## Hot files

No hot file is converted. The PR adds files in folders that are already collected (`.gatekeeper/gates/`,
`docs/`) and so leaves the frozen `.github/workflows/ci.yml` alone. It touches four shared files by a line or two
each, inside their limits: `web/src/shell.ts` (two exports), `web/package.json` (one script), `README.md` (one
sentence, in place) and `.drover/arch.toml` (below). `scripts/gen.sh` gains one line.

## The `.drover/arch.toml` lines

Add to `generated`:

```toml
    "fixtures/client/*.json",
```

Add two bans:

```toml
[[ban]]
pattern = "fetch("
paths = ["web/src/shell/mount.ts", "web/src/shell/local.ts"]
reason = "the shell draws what a Source hands it: only served() in shell/source.ts talks to a server"

[[ban]]
pattern = "stream("
paths = ["web/src/shell/mount.ts", "web/src/shell/local.ts"]
reason = "the shell draws what a Source hands it: only served() in shell/source.ts opens the stream"
```

`frozen`, `[[collect]]`, `generate` and the layers do not change. The generator stays `sh scripts/arch-gen.sh`;
`scripts/gen.sh` gains the line that writes the two fixtures:
`BLOCKS_GEN=1 cargo test -q --locked --manifest-path demo/client/Cargo.toml generated`.
