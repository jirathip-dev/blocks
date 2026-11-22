# Client-built screens from the app's own Rust

An app may build its screens in its own Rust, inside the app: as wasm in a browser page, natively behind its FFI on
iOS. There is no server and no stream. The app hands blocks a whole screen, then ops; blocks draws them and gives
each action back to the app. The decision and its measurements are in `docs/architecture/client-built/`.

The worked example is `demo/client`: a meter with a count, a list of sends and one button. Its native test writes
`fixtures/client/screen.json` and `send.json`; the WebKit page test and the Swift test read the same two files.

## The app's Rust

The `blocks` crate's default build, with no feature, compiles for `wasm32-unknown-unknown` and `aarch64-apple-ios`
(CI's `targets` gate holds it). The app uses what Mode A uses:

| It needs | It uses |
|---|---|
| the kinds and their builders | `blocks::{Screen, Stat, List, Row, Button, …}` |
| the screen as JSON | `serde_json::to_string(&Block)`, the form the stream sends |
| ops | `blocks::diff(&old, &new)`, from the screen it last handed out for that path |
| an action in, an answer out | `blocks::{Action, Answer}` with serde |
| the screen checked | `Built::new(json!(screen)).check(&[])`, in its native tests, not in the wasm |

`demo/client/src/lib.rs` is the whole app; `demo/client/src/glue.rs` is its wasm glue: five exports over one text
buffer the Rust owns (`text`, `text_at`, `text_len`, `screen`, `act`), with no dependency and no `unsafe` block.
`#[no_mangle]` is refused by the workspace's `unsafe_code = "forbid"`, so the example has its own `[workspace]` and
lock file, as `demo/egui` does. An app may use `wasm-bindgen` instead, in its own repo.

## The page: `mount` with a local source

```js
import { local, mount } from "@jirathip-dev/blocks/shell";

const meter = local({
  screen: (path) => JSON.parse(call(x.screen)),
  act: (action, path) => JSON.parse(call(x.act, JSON.stringify(action))),
});
mount({ root: document.body, layout, sources: { meter } });
```

- `mount` reads every screen and sends every action through a source. A layout source named in `sources` is drawn
  from it; any other is served from `url` as before. One page may mix both: `mount({ url, sources: { meter } })`.
- `local` holds each open path's screen and applies ops in place. An answer's ops patch the page; its `toast`,
  `open` and `close` work as a server's do. A thrown `Refused` shows its toast; any other error shows its message.
- `meter.push(path, ops)` takes ops no action asked for (a timer, a worker message).
- Ops that do not fit the screen held make `local` ask `screen(path)` again and redraw. The app answers in the
  order things happened; wasm in the page does by nature.

`demo/client/web/` is the whole page (`index.html`, `main.js`).

## SwiftUI: `BlocksView` as it is

`BlocksView(block, source: nil, act:)` takes a `Block` and gives each action to a closure. The app decodes the
screen from its FFI's JSON, turns each `BlockAction` into an `Action`, decodes the `Answer` and calls
`Block.apply(ops)`. When `apply` throws, it decodes the whole screen again. `ClientBuiltTests.swift` draws the
example's fixtures this way.

## Size

The example's wasm, built with its release profile (`opt-level = "z"`, `lto = "thin"`), is 1,334,810 bytes,
297,138 gzipped. The `client` gate fails it over 375,000 bytes gzipped. Most of that is the typed parse `diff`'s
self-check brings in; a new kind adds its reader and writer. A wasm over the ceiling means a typed parse or a
dependency got in, or the ceiling is raised in its own issue.

## What stays the app's job

- Its state, its screens, what each action does, and the screen it last handed out per path.
- Its wasm glue and loader, a worker if it wants one, and `wasm-unsafe-eval` in its CSP.
- Its iOS FFI (UniFFI, swift-bridge or a C header) and the threads behind it.
- Its build profile and its own size budget.
- Its own kinds, registered as today (`blocks` in `mount`, `.appBlocks` in SwiftUI).
- One pin for the crate, the npm package and the Swift package.
