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
use blocks::kind::{AppBlock, Fallback, Row, Screen, Tap, Toned};

let screen = Screen::new("queue", "Queue").blocks(vec![
    Row::new("12", "#12 fix the gate").badge(Toned::bad("needs you")).tap(Tap::open("/screens/issue?issue=12")).into(),
    AppBlock::new("herd", &Herd { weather, repos }, Fallback::new("3 lanes working")).into(),   // drover's own kind:
]);                                                 // its typed fields, and what a client with no view for it draws
let built = Built::of(&screen);                     // typed in, never `json!`; every other fallback is written here
assert_eq!(built.check(&["herd"]), []);             // in the app's fixture test: no unknown kind, field or shape
```

The diff, the stream and both ends' bookkeeping are drover #1318's (`screen-hub/usage.md`), unchanged:

```rust
match shelf.put(&key, &key.path, &built) { Put::Changed(delta) => holders.for_each(|q| q.push(&delta.frame)), _ => {} }
```

The format and the version are one media type, wherever the app's transport carries it (q2063):

```rust
let media = MediaType::pick(accept)?;               // `application/vnd.blocks+json;v=1`; Err: more than one version apart
respond(media.to_string(), media.write(&built));    // version 1 or the one before; CBOR later is one more `Format`
```

## Local behaviour, with no round trip (q2067)

```rust
use blocks::expr::{get, lit};

Screen::new("signup", "Sign up").state("more", lit(false)).blocks(vec![
    Chips::new("plan", ["free", "team"]).selected("free").into(),                 // a control's name is its state key
    Form::new("join").fields(vec![
        Field::text("email").check(get("email").is(Pattern::Email), "Enter an email address"),
        Field::text("seats").show(get("plan").eq(lit("team"))),                   // drawn only for the team plan
    ]).into(),
    Button::new("What is included?").tap(Tap::set("more", lit(true))).into(),     // changes state, sends nothing
    Prose::new().para("Unlimited screens on every renderer.").show(get("more")).into(),
]);
```

`get("email").is(…)` builds an `Expr` tree. The page, the Swift app and the static writer evaluate that tree; none
of them parses a string, and the server checks the form again when it is sent.

## An island (q2067)

```rust
Island::new("spend", "x-chart", &Chart { points }, Fallback::new("Spend this week: $41"))    // typed props, a fallback
    .events(["pick"]).size(Size::aspect(16, 9)).into()
```
```ts
customElements.define('x-chart', class extends HTMLElement {                   // in the app's own bundle
  set props(p: Chart) { draw(this, p); }
  pick(day: string) { this.dispatchEvent(new CustomEvent('blocks-event', { bubbles: true, detail: { name: 'pick', values: { day } } })); }
});
```
```swift
BlocksView(screen, …).islands(["x-chart": { props, send in ChartView(props: props) { day in send("pick", ["day": .string(day)]) } }])
```

The server receives `pick` as an ordinary action on block `spend` and answers with ops.

## A website (q2060)

```rust
use blocks::site::{self, Head, Live, Site};

let page = site::page(&built, &Site {
    head: Head { title: "Pricing", description: "…", canonical: "https://example.org/pricing", image: Some("/og.png"), lang: "en" },
    look: &look,                                    // schemes for both modes and a style: CSS variables in the head
    css: &["/app.css"],                             // the app's own stylesheet, after blocks.css
    action: "/act",                                 // where a form posts; `Action::from_form` reads it
    live: Some(Live { js: "/blocks.js", stream: "/stream" }),      // None: no script at all
});
```

The page reads, links and posts with no JS. With `live`, `blocks.js` adopts the same elements and the stream patches
them; nothing is redrawn.

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
let misses = blocks::theme::check_pack(&files, &schemes);   // a swag pack against the schemes it may name
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
  css: ['./drover.css'],                             // its style layer: rules on `.b-row`, `[data-variant]`, … (q2061)
  theme: board,                                      // `figure` and `word`: drover's art, until it moves to swag's packs/
  on: { unpaired: pairing, settings: [alerts], timing: timings },
});
```

`mount` owns what `main.ts` owns today and is not drover's: the tabs and their strip, the sheet and its back stack,
the kept copies, the one stream and its patcher, an action's `POST` and its toast, the confirm box, the look sheet,
local state and its expressions, islands, and adopting a static page when the root already holds one.

## cooee's app (Swift)

```swift
import Blocks
import BlocksUI

BlocksView(screen, poster: slot.source, act: { store.send(.act($0)) }, open: { store.send(.open($0)) })
    .appBlocks(Cooee.blocks)                         // ["pinned": { PinnedBlock($0) }, "chats": …, "account": …]
    .look(look)                                      // the tokens: the palette from a `Scheme`, the `Style`, the art
    .blockStyle(.card, Raised())                     // cooee's style layer: a `BlockStyle` wraps a card's content

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

## Headless: a verify lane, a perf gate, a test (q2058)

```sh
npx blocks-shot --screen queue.json --size 390x844 --css web/src/drover.css --script tap-first-row.json --check --out shots/
swift run blocks-snap --screen queue.json --size 402x874 --scheme paper --script tap-first-row.json --check --out shots/
```
```json
[{ "tap": { "id": "12" } }, { "answer": { "ops": [], "open": "/screens/issue?issue=12" } }, { "shot": { "name": "opened" } }]
```

Each writes `shots/opened.png`, `shots/opened.tree.json` and `report.json` (the actions sent, the timings) and exits
1 when a block is missing, drawn as a fallback where a view was expected, empty, off the screen or over its sibling.
The same in a test, where an app's SwiftUI styles and islands can be passed:

```swift
let run = try await Snapshot(screen, size: .phone).blockStyle(.card, Raised()).run([.tap(id: "12"), .shot("opened")])
#expect(run.sent == [Action(screen: "queue", block: "12", action: "open")])
```

## An app adds a block kind of its own

Three registrations, one per language the app uses. No file in this repo changes.

| Where | What the app writes | A clash with a core kind |
|---|---|---|
| its server | `AppBlock::new("herd", &fields, fallback)`; `built.check(&["herd"])` in its fixture test | `Fault::Clash { kind }` fails the test |
| its page | `mount({ blocks: { herd } })` | does not compile |
| its Swift app | `.appBlocks(["pinned": …])` | `AppBlocks.init` throws; the app's test calls it |

A client with no view for an app kind draws its fallback: the other app, the static page, an older build.

## A new core kind (a PR in this repo)

One file per renderer, no shared file edited by hand:

```
crates/blocks/src/kind/gauge.rs      the fields, `plain()`, its hooks and a typed sample; `just gen` adds it to the enum,
                                     the schema, types.ts, Blocks.swift and writes fixtures/{blocks,trees,html}/gauge.*
crates/blocks/src/site/gauge.rs      without it the crate does not build: `site` matches every `Block`
web/src/render/gauge.ts              without it `tsc` fails: the renderers are a `Record<Kind, …>`
swift/Sources/BlocksUI/Kinds/Gauge.swift     without it `swift build` fails: the switch over `Kind` is exhaustive
docs/…                               nothing: older clients draw its fallback, so no version changes
```

## The tests, per repo

- blocks: `apply(a, ops(a, b)) == b` on every fixture pair and in `just sim`; every `fixtures/blocks/*.json` parses
  with no fault, validates against the schema, decodes in Swift and is drawn by all three renderers into the tree
  `fixtures/trees/` expects; the two HTML writers give the same element; `fixtures/behave/` has one value in Rust,
  TS and Swift; the fixture site is equal before and after it is taken over; every bad fixture in
  `fixtures/layouts`, `schemes` and `styles` is refused by the Rust and the Swift reader with the same reason; the
  last release's renderers draw today's fixtures (`compat.yml`).
- drover and cooee: the pin test; `no_fixture_screen_has_a_fault`; their own goldens and snapshot frames, unchanged
  by each move.
