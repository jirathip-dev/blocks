# Boundaries and state

## Who may use whom

| module | may use | never |
|---|---|---|
| `codegen/hooks.rs`, `codegen/swift/kinds.rs` | `tree::{VARIANTS, ROLES, NAMES}`, `patch::{HOSTS, WALKED}`, the schema, the names of the files in `BlocksUI/Kind/` | a table of kinds of its own |
| `web/src/core/apply.ts` | `gen/hooks.ts` (`hosts`, `walked`), `core/kind/prose.ts` | a list key written in place |
| `Blocks/Apply.swift` | `Block.hosts`, `Block.walked` | a `switch` over kinds |
| `BlocksUI/Tree.swift` | `variant`, `source`, `named`, `roles`, `names` from `Gen/Kinds.swift` | a `switch` with one arm per core kind |
| `BlocksUI/BlockNode.swift` | `KindView`, `AppBlockView`, `Styled`, `Reported`, `Identified` | a kind's view by name |
| `BlocksUI/Kind/<Kind>.swift` | `BlockNode`, `BlockStack`, `ActButton`, `Part/`, `Field/`, the look, the environment | another kind's private views |
| `BlocksUI/Part/<Part>.swift` | the look, the environment, another part | a kind's view |
| `BlocksSnapshot/Step/<Step>.swift` | `Run` and its `redraw`, `Behaviour`, a kind's `Rules` | `ImageRenderer`, another step |
| `BlocksSnapshot/Snapshot.swift` | `Run`, each step's method | a step's logic |
| a test that needs every kind | `Block::KINDS`, `Block.tags`, the keys of `hooks`, `native` | a number of kinds, a list of kinds |
| `web/src/shell.ts` | `export` lines | a function, a type of its own |
| `web/src/shell/host.ts` | `render/block.ts`, `render/ctx.ts`, `patch.ts`, `render/kind/prose.ts` (`grow`) | `fetch`, the stream, the sheet |
| `web/src/shell/mount.ts`, `adopt.ts` | `host`, `layout`, `look`, `sheet`, `store`, `stream.ts`, `core/apply.ts` | a `Ctx` literal, a `patcher(` call |
| `web/src/render/**`, `web/src/core/**` | as today | `shell/` |
| `web/build.mjs` | `bundle/*.json`, `src/css/`, esbuild, `tsc` | the name of a bundle |
| `web/bundle/<name>.json` | another bundle, by name in `uses` | a path under `dist/` |
| `web/src/core/look.ts` | `gen/schemes.ts`, `core/gate.ts` | a CSS rule, a curve or a selector written in place |
| `theme/css.rs` | `theme/style.rs` (each enum's `css`), `theme/scheme.rs` | a `match` on a style value |
| `.gatekeeper/gates/swift-<check>.toml` | `swift`, `node`, `jq`, `scripts/` | another gate's output |

The crate's layers do not change: `theme/css.rs` is in `theme`, the two constants are in `patch`, and `codegen`
may already use both. What holds each rule:

| rule | held by |
|---|---|
| Swift's facts are the crate's | arch-check: both `Gen/Kinds.swift` files are `generated` |
| Swift draws every kind | the compiler: `KindView`'s `switch` has no `default`; a kind with no file fails `just gen` |
| `HOSTS` and `WALKED` are what `patch.rs` does | the test beside them, over every kind's sample |
| the three languages apply an op alike | `fixtures/protocol`, as today |
| no test names the kinds | none; review. A count that comes back conflicts with the next kind's PR, as it did |
| every kind has a fixture and a tree | `shot.test.ts`, `SnapshotTests.swift`, over the generated list |
| `mount` and `adopt` draw through `host` | arch-check: a ban on `patcher(` in `web/src/shell/**` but `host.ts`, which slice 5 adds |
| `shell.ts` stays a list of exports | arch-check: `shared`, 40 lines |
| a bundle is in `web/dist` and is current | arch-check: `web/dist/*.js` is `generated` |
| a bundle's entry is known to knip | `ts/knip`: an entry not in `knip.json` is an unused file |
| TypeScript's CSS is the crate's | `fixtures/css`, as today; and `gen/schemes.ts` is `generated` |
| a new style value has its rule | the compiler: `css()` matches every value |
| an old file does not come back | arch-check: `frozen` |
| a quiet file stays small | arch-check: its `[[size]]` rule, for every extension now |

## A scripted run of the Swift harness, as a statechart

```text
  [made]  Run(screen): edits, picks and opened empty
     │ redraw
     ▼
  [drawn]  seen is the drawing of the state now; its island events are in out.sent or out.dropped
     │                                   │                                 │
     │ a step that changes state          │ a step that changes nothing     │ shot
     │ (frame, answer, refuse, type,      │ (scroll, unknown, a tap that    ▼
     │  file, a tap that sets or opens)   │  only sends, a gesture)       take: the PNG and the tree kept under the
     ▼                                   ▼                               shot's name; with check, the faults added
  [stale] ── redraw ──▶ [drawn]        [drawn]  out.sent or out.dropped grew
     │
     │ the step throws (an op that does not fit)
     ▼
  [failed]  run throws; nothing is reported
  after the last step, with no shot taken: take(name); then [reported]
```

Each step's method leaves the run drawn: it calls `redraw` itself when it changed `screen`, `edits`, `picks` or
`opened`. `Snapshot.run` never calls `draw`.

## A screen in the shell, as a statechart

Slice 5 moves this and changes none of it; `web/test/shell.test.ts` holds it.

```text
  [made]  view(source, path): no model, kept state empty, back stack empty
     │ show
     ▼
  [live]  the model the store kept, if any, is painted; the path is open on its source's one stream
     │   ├─ a screen arrives ──▶ kept in the store, painted
     │   ├─ ops arrive ──▶ the patcher queues and flushes them
     │   ├─ an action's answer ──▶ its ops applied and painted; then its close, open and toast
     │   └─ go(path) ──▶ hidden, the old path pushed on the back stack, the model and the open set cleared ──▶ [live]
     │ hide (another tab is picked, the sheet is closed)
     ▼
  [held]  the patcher dropped, the path closed on the stream; the model, the kept state and the back stack stay
     │ show
     ▼
  [live]

  the shell closes (the window crosses 1000 px, or close()): every view is hidden and dropped; the next shell makes new ones
```

An adopted page has one screen that is made live and never hidden. Its `host` is the same; its model starts
from the page's own JSON, and an `open` leaves the page.

## A listed file

The chart in `../hotspots-2026-11-16/boundaries.md` holds, with one more ending: a file hot because it copies
a fact goes to `[generated]`, where a conflict is settled by running `just gen` again.
