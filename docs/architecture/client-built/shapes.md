# Shapes

## The layout: what the PR adds and changes

```text
.gatekeeper/gates/targets.toml        new: the crate builds for wasm32-unknown-unknown and aarch64-apple-ios
.gatekeeper/gates/client.toml         new: the example builds to wasm under its ceiling; its page test in WebKit
web/src/shell/source.ts               new: Source, Refused, served (the stream and the POST, moved out of mount.ts)
web/src/shell/local.ts                new: Local, local
web/src/shell/mount.ts                changed: reads every screen and sends every action through a Source
web/src/shell.ts                      changed: exports local, Refused and the types Source, Local
web/test/source.test.ts               new: node, the fake DOM
web/test/client/page.test.ts          new: WebKit, run by `npm run test:client`
web/package.json                      changed: one script line, "test:client"
demo/client/Cargo.toml, Cargo.lock    new: its own [workspace], as demo/egui
demo/client/src/lib.rs, glue.rs       new: the app and its five exports
demo/client/web/index.html, main.js   new: the page
fixtures/client/screen.json, send.json   new, generated
swift/Tests/BlocksTests/ClientBuiltTests.swift   new
scripts/gen.sh                        changed: one line, the example's `generated` test under BLOCKS_GEN=1
docs/client-built.md                  new: the mode for an app's author; README.md's Mode B sentence and docs/consume.md point at it
.drover/arch.toml                     changed: the lines at the end of adr.md
```

Nothing changes under `crates/`, `swift/Sources/` or `web/src/stream.ts`. `web/dist/` is rebuilt by `just gen`.

## TS: the source seam

```ts
// web/src/shell/source.ts
import type { Action, Answer, Block, Op, Toast } from "../gen/types.ts";

/// Where a layout source's screens come from and where its actions go: a server, or the app's own code.
export type Source = {
  /// Starts handing `on` the screen at `path`: the whole screen, then each change with the ops that made it.
  open(path: string, on: (screen: Block, ops?: Op[]) => void): void;
  close(path: string): void;
  /// Sends an action from the screen at `path`; a rejection is a failed action.
  act(path: string, a: Action): Promise<Answer>;
};

/// A failed action that brings its own toast; any other rejection shows its message.
export class Refused extends Error {
  readonly toast: Toast;
}

/// A server as a Source: its one device stream and its `/action` POST. Not exported from the package.
export function served(url: (path: string) => string, state: (s: State) => void): Source;
```

`open` and `close` are exactly what `stream()` returns today, so `stream.ts` does not change. `served` posts the
body `posted()` writes today, byte for byte, and rejects with `Refused({ title: "action failed: <status>", ...toast })`
where `mount.ts` shows that toast today. `web/test/shell.test.ts` already holds both.

```ts
// web/src/shell/local.ts
/// The app's own code, as a source needs it.
export type Local = {
  /// The whole screen at `path`, as it is now. Later ops start from this screen.
  screen(path: string): Block | Promise<Block>;
  /// What an action does. The answer's ops are for the screen at `path`.
  act(a: Action, path: string): Answer | Promise<Answer>;
  /// The page stopped showing `path`: the app may stop making ops for it.
  close?(path: string): void;
};

/// A Source over the app's own code; `push` hands it ops no action asked for.
export function local(app: Local): Source & { push(path: string, ops: Op[]): void };
```

`local` is the one holder of each open path's screen, as `Mirror` is for a stream. It applies an answer's ops and
pushed ops with the core's `apply`, hands the shell `on(screen, ops)` so the patcher draws them in place, and gives
the shell the answer without its `ops`. `boundaries.md` has its statechart.

```ts
// web/src/shell/mount.ts
type FromServers = { url: (source: string, path: string) => string; sources?: Record<string, Source> };
type FromTheApp = { url?: undefined; sources: Record<string, Source> };
export type Mount = { root: HTMLElement; layout: Layout; /* blocks, components, css, theme, schemes, store, edit, file: as today */ } & (FromServers | FromTheApp);
```

A layout source named in `sources` is drawn from it; any other source is `served` from `url`. A source with
neither stops `mount` with an error that names it.

## Rust: no new type

The crate's public surface does not change. A client-built app uses what is there:

| It needs | It uses |
|---|---|
| the kinds and their builders | `blocks::{Screen, Stat, List, Row, Button, …}`, `new(required).setter()` |
| the screen as JSON | `serde_json::to_string(&Block)`, the form the stream sends |
| ops | `blocks::diff(&old, &new) -> Vec<Op>` |
| an action in, an answer out | `blocks::{Action, Answer}` with serde |
| the screen checked | `Built::of(&screen).check(&[])`, in its native tests |
| features | none: the default build. `schema` stays off: it is codegen's, with files and schemars |

## The example's exports

| Export | Does |
|---|---|
| `text(len) -> ptr` | makes the buffer `len` zero bytes long and says where it is, for the page to write into |
| `text_at() -> ptr`, `text_len() -> len` | where the buffer is now and how long, for the page to read |
| `screen()` | writes the whole screen's JSON into the buffer |
| `act()` | reads an `Action`'s JSON from the buffer, writes the `Answer`'s JSON into it; text that is no action gets `{}` |

`#[no_mangle]` is refused by the workspace's `unsafe_code = "forbid"`, so `demo/client` stands outside the
workspace with its own `Cargo.lock`, as `demo/egui` does. Its function bodies hold no `unsafe` block.

```toml
# demo/client/Cargo.toml
[workspace]

[lib]
crate-type = ["cdylib"]

[dependencies]
blocks = { path = "../../crates/blocks" }
serde_json = "1"

[profile.release]
opt-level = "z"
lto = "thin"
codegen-units = 1
panic = "abort"
strip = true
```

## The fixtures

Written by the example's native `generated` test, read by the WebKit test and the Swift test.

```jsonc
// fixtures/client/screen.json: the first screen
{ "type": "screen", "id": "meter", "title": "Meter", "blocks": [
  { "type": "stat", "id": "count", "label": "sent", "value": 0 },
  { "type": "list", "id": "sends", "rows": [] },
  { "type": "button", "id": "send", "label": "Send one", "action": "send" } ] }

// fixtures/client/send.json: the first tap and what the app answered
{ "action": { "screen": "meter", "block": "send", "action": "send" },
  "answer": { "ops": [
    { "op": "insert", "into": "sends", "block": { "type": "row", "id": "send-0", "title": "Send 0" } },
    { "op": "merge", "id": "count", "fields": { "value": 1 } } ] } }
```

This is the JSON the prototype's wasm returned (`measured.md`), laid out for reading.

## The gates

```toml
# .gatekeeper/gates/targets.toml
about = "the blocks crate's default build compiles for wasm32-unknown-unknown and aarch64-apple-ios, so an app's own Rust can link it"
fix = "keep files, clocks, threads and host-only crates out of the default build: behind the schema feature or in blocks-cli"
budget_secs = 600
setup = ["rust"]
paths = ["crates/blocks/**", "Cargo.*", "rust-toolchain.toml", ".gatekeeper/gates/targets.toml"]
run = """
if [ -z "${CI:-}" ]; then echo "targets: CI runs it; a lane's host has neither target"; exit 0; fi
set -e
rustup target add wasm32-unknown-unknown aarch64-apple-ios
cargo build --locked -p blocks --lib --target wasm32-unknown-unknown
cargo build --locked -p blocks --lib --target aarch64-apple-ios
"""
```

```toml
# .gatekeeper/gates/client.toml
about = "the client-built example: demo/client's tests, its wasm under the size ceiling, and its page drawn in WebKit from local code with no request beyond its own files"
fix = "fix the example or the shell the test names; a wasm over the ceiling means a typed parse or a dependency got in: docs/client-built.md"
budget_secs = 900
leg = "web"
setup = ["rust", "node"]
paths = ["demo/client/**", "crates/blocks/**", "web/**", "fixtures/client/**", "Cargo.*", "rust-toolchain.toml", ".gatekeeper/gates/client.toml"]
run = """
if [ -z "${CI:-}" ]; then echo "client: CI's web leg runs it; a lane's host has no wasm32 target"; exit 0; fi
set -e
rustup target add wasm32-unknown-unknown
cargo test --locked --manifest-path demo/client/Cargo.toml
cargo build --locked --release --target wasm32-unknown-unknown --manifest-path demo/client/Cargo.toml
wasm=demo/client/target/wasm32-unknown-unknown/release/meter.wasm
size=$(gzip -9c "$wasm" | wc -c)
echo "meter.wasm: $(wc -c < "$wasm") bytes, $size gzipped, ceiling 375000"
[ "$size" -le 375000 ]
npm --prefix web ci --no-audit --no-fund
npx --prefix web playwright install --with-deps webkit
npm --prefix web run test:client
"""
```

Both are sketches of the commands; the impl lane fits them to gatekeeper's wrapper. The ceiling is the measured
297,161 bytes plus a quarter. It is raised only in its own issue, as a perf budget is, and lowered by the
follow-up if the owner files it.
