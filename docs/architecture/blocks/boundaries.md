# blocks: module boundaries and the statecharts (#2)

## The repos

```
jirathip-dev/swag ── art only ──> theme/packs/ (vendored at one commit by `just swag <sha>`)
jirathip-dev/blocks               names nothing of drover's or cooee's
      ▲ one commit per app, in every manifest of that app
drover:  drover-server (Cargo rev) · web/ (npm #sha)
cooee:   cooee-core, cooee-server (Cargo rev) · apple/ (SwiftPM revision)
```

drover and cooee never depend on each other. cooee stops pinning swag; drover stops when its page moves to `packs/`.

## The crate's layers

`.drover/arch.toml` `[[layer]]` rules, checked by `drover arch-check` (they replace blocks#1's four).

```
kind ◄── built ◄── diff  ◄── shelf
  ▲        ▲────── patch ◄── mirror
  └────── wire ◄── diff, patch, shelf, mirror
layout · theme · web: each alone          codegen: uses every layer; nothing uses it
```

| Layer | Owns | May use | Must not |
|---|---|---|---|
| `kind` | a struct per block kind, the shared parts, the generated `Block` | serde | know an op, a frame or a renderer |
| `built` | `Built`, `Fault`, `check` | `kind` | diff |
| `wire` | `Op`, `Frame`, `Hello`, `Sync`, `Action`, `Answer`, a frame's SSE text, `old` | `kind` | open a socket; name a path or a header |
| `diff`, `patch` | `ops(a, b)`, `apply(screen, ops)` | `kind`, `built`, `wire` | each other |
| `shelf` | the server's half: revs, the ring, a key's state | `built`, `wire`, `diff` | know a device or a stream |
| `mirror` | a client's half: revs held, which frame applies | `built`, `wire`, `patch` | fetch |
| `layout` | `Layout`, `Contract`, `check`, `merge`, `resolved` | serde, serde_json | name a component but `nav`; read a file |
| `theme` | `Scheme`, `gate`, `Style`, `Theme`, the built-in schemes, the vendored packs | serde, serde_json | draw; read a file (the packs are compiled in) |
| `web` | `JS`, `CSS` | nothing | |
| `codegen` | the schema, the TS and Swift writers | every layer, `std::fs`, schemars | be linked by an app (`schema` feature) |

The crate's bans stay as blocks#1 wrote them: no tokio, `std::net`, `std::process`, clock, or `std::fs` outside
codegen; no `drover`. This ADR adds `cooee` to that ban.

## The TS package

```
gen/types.ts, gen/schemes.ts <── stream.ts          one EventSource, hello, sync, revs (screen-hub)
                             <── patch.ts           ops onto a view through the `draw` it is given (screen-hub)
                             <── theme.ts           the `Theme` port, `packs`, a scheme as CSS
                             <── render/<kind>.ts   one block as DOM
shell.ts ──> all of the above                       the layout's walk: tabs, sheet, kept copies, actions
```

| Module | May call | Must not (enforced by) |
|---|---|---|
| `render/*` | `gen`, `theme.ts`, the `Ctx` it is handed | `fetch`, `EventSource`, `localStorage`, `history`, another kind's file but through `render` (bans) |
| `patch.ts` | `gen`, the `draw` it is given | draw a block itself; `fetch` (ban) |
| `stream.ts` | `gen`, `fetch` | touch the DOM (ban on `document`) |
| `theme.ts` | `gen` | `fetch` but for a pack's `sprites.svg` |
| `shell.ts` | everything | know a screen's path, a tab's name or an app's block (the `drover` and `cooee` bans) |

`render/index.ts` is a `Record<Kind, Renderer>`: a core kind with no renderer does not compile. A kind HTML does
not draw yet is written `gap(<issue>)`, which draws the children, so each gap is one greppable line with its issue.

## The Swift package

| Target | Imports | Holds | Must not |
|---|---|---|---|
| `Blocks` | Foundation | the generated types, `JSONValue`, `Mirror`, `Layout` (with a `Contract`), `Style`, `Scheme` | `import SwiftUI` (ban) |
| `BlocksUI` | `Blocks`, SwiftUI | `BlocksView`, `SlotView`, `Look`, `Palette`, one view per kind | TCA, a store, a URL (ban on `ComposableArchitecture`; the views take closures: `act`, `open`) |

`BlocksView` switches over the generated `Kind`, exhaustively; a kind SwiftUI does not draw yet is `Gap(<issue>)`.
The package builds in Swift 6 mode with complete concurrency checking and warnings as errors, as cooee's does.

## Who may call whom, across repos

| Caller | May call | Never |
|---|---|---|
| an app's server | `blocks::{kind, Built, diff, Shelf, wire, layout, theme, web}` | define an `Op`, a `Frame`, a block type of a core kind, a scheme gate or a layout rule of its own |
| an app's page | `mount`, the package's types, `el` and `kids` for its own blocks | open an `EventSource`; apply an op; draw a core kind |
| an app's Swift code | `Blocks`, `BlocksUI` | decode a core block by hand; keep its own `JSONValue` |
| this repo | serde, serde_json (schemars, esbuild and typescript to build) | drover, cooee, a transport, a clock |

## Statechart: a key on a client that may be older than its server

screen-hub's page chart (`screen-hub/boundaries.md`), with the two transitions this ADR adds, marked `new`. The
crate's `Mirror`, `stream.ts` and the Swift `Mirror` all follow it and run `fixtures/protocol/`.

```mermaid
stateDiagram-v2
    [*] --> Syncing: hello, v at or below mine / open the key (with its rev if same epoch)
    [*] --> Outdated: hello, v above mine (new)
    Syncing --> Live: the key's state / apply it
    Live --> Live: frame, from = rev held, every op known / patch
    Live --> Live: frame, rev at or below rev held / drop it
    Live --> Syncing: frame, from above rev held / open the key with its rev
    Live --> Syncing: frame with an op I do not know (new) / drop it, open the key with no rev
    Outdated --> [*]: the app is updated
```

In `Outdated` the client shows its last copy and one line, `update the app`. It does not sync, so it never applies
ops it could misread.

## Statechart: one block, as a renderer meets it

```mermaid
stateDiagram-v2
    [*] --> Core: its type is a core kind
    [*] --> App: the app registered its type
    [*] --> Unknown: neither
    Core --> Drawn: this renderer's view for the kind
    Core --> Children: the kind is a gap here
    App --> Drawn: the app's view
    Unknown --> Children: it has blocks or rows
    Unknown --> Nothing: it has none
    Children --> Drawn: each child, by this same chart
```

No path ends in an error: a block a client cannot draw never breaks the screen around it.

## Statechart: a layout (cooee's, now for both shells)

```mermaid
stateDiagram-v2
    [*] --> Default: no layout.json
    [*] --> Good: the file passes the check
    [*] --> BrokenLast: it fails (the default is served)
    Default --> Good: a write that passes / changed
    Good --> Good: a write that passes / changed
    Good --> BrokenLast: a write that fails / broken, with its line and why. The last good one stays served
    BrokenLast --> Good: a write that passes / changed
    Good --> Default: reset / the old file kept as .bak
```

A client keeps the last layout that decoded and draws it until a newer one decodes. The file watch, the routes and
the reset are the app's; the states and `check` are this repo's.

## Statechart: a change to the wire, across the three repos

```mermaid
stateDiagram-v2
    [*] --> Merged: a blocks PR on staging (generated files fresh, both renderers build)
    Merged --> PinnedOne: one app moves its pin
    PinnedOne --> PinnedBoth: the other app moves its pin
    PinnedBoth --> [*]: additive: done
    PinnedBoth --> Removed: breaking: the old form is deleted, SCHEMA_VERSION + 1
    Removed --> [*]: both apps move their pins again
```

Between `Merged` and `PinnedBoth` the apps run different blocks commits against each other. The versioning table
(`shapes.md`) is what makes that safe.
