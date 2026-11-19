# Extending: when blocks lacks a look

When an app needs a look blocks does not give, it climbs this ladder and stops at the first step that works.
It never writes its own copy of a core kind.

## 1. A token

Set it in the app's `Scheme` (colours: `tokens`) or `Style` (type, space, radius, motion, surface, fills).
Every renderer reads the same tokens, so one change reaches the web page, the static site and SwiftUI.

Example: buttons look too round. Set a smaller `radius` in the app's `Style`; no kind changes.

## 2. A named variant

When no token gives the look, a design-first issue in this repo adds a name to the kind's typed list
(`Tone`, `CardKind` and the like), drawn in every renderer in the same PR.

Example: a card needs a "receipt" look. The issue adds `receipt` to `CardKind`, with its design,
and the web, site and SwiftUI renderers each draw it.

## 3. A new core kind

When two apps need the block, or one app needs it on many screens. Design first, then one PR in this repo
that adds the kind to every renderer (`docs/architecture/blocks/usage.md`, "A new core kind").

Example: two apps each show a progress gauge. A `gauge` kind lands here, and both use it.

## 4. The app's own kind, or an island

For one app only. It is a box: props in, events out, and a fallback that every other client draws.

- An app kind: registered per language (`AppBlock` on its server, `mount({ blocks })` on its page,
  `.appBlocks` in its Swift app).
- An island: a custom element the page defines; `props` in, a named `blocks-event` out, its fallback until it loads.

Example: one app draws a seating map. It registers a `seats` kind with a plain row as its fallback.

## Never replace a core kind

An app never replaces a core kind's view, in any renderer. Each one refuses it:

- Rust: `Built::check` returns `Fault::Clash` for an app kind named like a core kind.
- Web: `mount({ blocks })` with a core kind's name does not compile.
- SwiftUI: `AppBlocks` throws `.clash`.

A SwiftUI or desktop wrap (`.blockStyle`) decorates a kind; it does not hide its content.
