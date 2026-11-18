# blocks: how the callers read (#2)

Sketches, not code to copy. The names are the ones `shapes.md` and `boundaries.md` use.

## The pin: one commit per app

An app names one blocks commit in each of its manifests. A test in the app fails when two of them differ.

```toml
blocks = { git = "https://github.com/jirathip-dev/blocks", rev = "<40 hex>" }        # drover and cooee: Cargo.toml
```
```json
"@jirathip-dev/blocks": "github:jirathip-dev/blocks#<the same 40 hex>"
```
```swift
.package(url: "https://github.com/jirathip-dev/blocks", revision: "<the same 40 hex>")   // cooee: apple/Package.swift
```

Moving the pin is one PR in the app: the three lines above, the lock files, and for drover `web/dist`.

## A server builds a screen (drover and cooee, Rust)

```rust
use blocks::kind::{Block, Card, Row, Screen, Text};

let screen = Screen::new("queue", "Queue").blocks(vec![
    Row::new("12", "#12 fix the gate").badge(Toned::bad("needs you")).tap(Tap::open("/screens/issue?issue=12")).into(),
    Herd { weather, repos }.into(),                 // drover's own kind: any `Serialize` with a `type` the app declared
]);
let built = Built::new(serde_json::to_value(&screen)?);
assert_eq!(built.check(&["herd"]), []);             // in the app's fixture test: no unknown kind, field or shape
```

The diff, the stream and both ends' bookkeeping are drover #1318's (`screen-hub/usage.md`), unchanged:

```rust
match shelf.put(&key, &key.path, &built) { Put::Changed(delta) => holders.for_each(|q| q.push(&delta.frame)), _ => {} }
```

## A server checks a layout and a scheme

```rust
use blocks::layout::{self, Component, Contract};

static SHELL: Contract = Contract {                 // cooee's; drover's has no component of its own
    components: &[Component { kind: "chat", slots: &["strip", "cards"], config: &["composer", "stop", "back"] }, /* … */],
    locked: &["/screens/pairing", "/screens/reset-layout"],
};
let layout = layout::check(&text, &SHELL)?;         // Err(Broken { line, col, why }): the last good one stays served
let (layout, skipped) = layout::merge(layout, &plugin_places, &SHELL);

let scheme: Scheme = serde_json::from_str(&file)?;  // a token that is not #rrggbb[aa] does not parse
let misses = blocks::theme::gate(&scheme);          // contrast and ΔE: empty, or the scheme is refused
let builtin = blocks::theme::schemes();             // the 12 in theme/schemes/, gated in this repo's CI
```

## drover's page (TS): the whole of `main.ts` after the move

```ts
import { mount } from '@jirathip-dev/blocks';
import { herd } from './herd';
import { alerts, pairing, timings } from './own';

declare const LAYOUT: Layout;                        // drover's layout.json, checked by serve, inlined in the page

mount({
  root: document.body,
  layout: LAYOUT,
  url: (source, path) => new URL(path.slice(1), document.baseURI).href,
  blocks: { herd },                                  // drover's own kind; a core kind's name here does not compile
  theme: board,                                      // `figure` and `word`: drover's art, until it moves to swag's packs/
  on: { unpaired: pairing, settings: [alerts], timing: timings },
});
```

`mount` owns what `main.ts` owns today and is not drover's: the tabs and their strip, the sheet and its back stack,
the kept copies, the one stream and its patcher, an action's `POST` and its toast, the confirm box, the look sheet.

## cooee's app (Swift)

```swift
import Blocks
import BlocksUI

BlocksView(screen, poster: slot.source, act: { store.send(.act($0)) }, open: { store.send(.open($0)) })
    .appBlocks(Cooee.blocks)                         // ["pinned": { PinnedBlock($0) }, "chats": …, "account": …]
    .look(look)                                      // the palette from a `Scheme`, the `Style`, the pack's art

SlotView(layout.resolved(for: size)) { component in  // a node whose type is cooee's: chat, sidebar, scanner, settings…
    CooeeComponent(component, store: store)
}

var mirror = Mirror()                                // the same rules as the crate's `Mirror` and the page's stream.ts
switch mirror.frame(frame) { case .patched, .replaced: draw(); case .old: break; case .gap: reopen(frame.k) }
```

`poster` comes from the slot, never from JSON: a `secret`, `run`, `confirm` or `permissions` card with no poster
draws the red `source unknown` line, as cooee's `CardBlock` does today.

## cooee embeds the HTML renderer (no Node in cooee)

```rust
use blocks::web::{CSS, JS};                          // web/dist/blocks.{js,css}, built in this repo, as two strings
route("/blocks.js", || js(JS)); route("/blocks.css", || css(CSS));
```
```html
<script type="module">import { mount } from './blocks.js'; mount({ root, layout, url, blocks: {}, theme: packs(look) });</script>
```

## An app adds a block kind of its own

Three registrations, one per language the app uses. No file in this repo changes.

| Where | What the app writes | A clash with a core kind |
|---|---|---|
| its server | `built.check(&["herd"])` in its fixture test | `Fault::Clash { kind }` fails the test |
| its page | `mount({ blocks: { herd } })` | does not compile |
| its Swift app | `.appBlocks(["pinned": …])` | `AppBlocks.init` throws; the app's test calls it |

A client with no renderer for an app kind draws that block's children, else nothing: the same as for a core kind it
is too old to know.

## A new core kind (a PR in this repo)

One file per language, no shared file edited by hand:

```
crates/blocks/src/kind/gauge.rs      the struct; `just gen` adds it to the enum, the schema, types.ts and Blocks.swift
fixtures/blocks/gauge.json           every field set; the Rust, TS and Swift tests read it
web/src/render/gauge.ts              without it `tsc` fails: the renderers are a `Record<Kind, …>`
swift/Sources/BlocksUI/Kinds/Gauge.swift     without it `swift build` fails: the switch over `Kind` is exhaustive
```

## The tests, per repo

- blocks: `apply(a, ops(a, b)) == b` on every fixture pair and in `just sim`; every `fixtures/blocks/*.json` parses
  with no fault, validates against the schema, decodes in Swift and is drawn by both renderers; every bad fixture in
  `fixtures/layouts`, `schemes` and `styles` is refused by the Rust and the Swift reader with the same reason.
- drover and cooee: the pin test; `no_fixture_screen_has_a_fault`; their own goldens and snapshot frames, unchanged
  by each move.
