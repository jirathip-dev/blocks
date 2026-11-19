# react: a framework-neutral TS core, a React adapter and client-built screens (#81)

## Summary

Decision: blocks gets a TS core with no framework in it (typed builders, check, behaviours, tree tests, a scoped
stylesheet) and a React adapter that draws each kind as a real React component, held to the HTML renderer by a
same-markup test. Hosting the HTML renderer inside React was built and measured, then rejected. check is a TS port.
Slices: seven, about 1,400 counted lines: core entry, builders, check, scoped CSS, adapter frame, 9 kinds, 3 kinds.
Answered (q2271): 13 kinds now, the other 14 as fallbacks in one later issue; the cap stays at 19,000 (#120), with
one more raise sized by `drover cap` before R5, which starts counting `web/react/`; one package `@jirathip-dev/blocks`
with the `/react` path; react-dom, @types/react and @types/react-dom approved as dev-only tools.

## Read in this order

| File | What |
|---|---|
| `usage.md` | how the callers read: a synergy route end to end (screen, loader, view, actions, island, brand, test), and a second adapter |
| `adr.md` | the question, the two modes, the options, the decision in ten parts, consequences, open questions, hot files, the `.drover/arch.toml` lines |
| `shapes.md` | the layout, the data shapes: builders, `Built`, `Fault`, the view's props, islands, the look, the adapter's boot |
| `boundaries.md` | which module may call which and what enforces it, the adapter contract with its conformance fixtures, two statecharts |
| `measured.md` | the spike of both ways to draw in React with its numbers, and json-render and A2UI as tried: what ran, what blocks takes as its own |

## The two modes

| | Mode A, server-driven | Mode B, client-built |
|---|---|---|
| Who | drover, cooee | synergy |
| The screen is built by | a Rust server, with the kinds' `new` and setters | TS builders in a route loader |
| It changes by | row ops over the device stream | the loader running again: a new screen |
| Drawn by | the HTML shell, SwiftUI, the static site | the React adapter |
| Uses | everything | kinds, generated types, builders, check, `blocks.css`, the guard kit (#79) |
| Does not use | | shelf, mirror, the stream, wire versioning, site |

The screen is data in both: a tree of typed blocks that is checked, then drawn.

## The slices, in order

Counted lines are non-test, non-generated lines under `ci/cap.toml`. The cap is 19,000 (#120); the seven slices
need about 1,400, and one more raise, sized by `drover cap`, lands before R5 (q2271). R2's move of `codegen.rs` into
the `codegen/` folder is one slice shared with #79's G1, filed once.

| | Slice | Builds | Counted lines | After |
|---|---|---|---|---|
| R0 | this issue's own PR | this folder; README's opening names the two modes (`adr.md` part 1 has the text) | 0 | |
| R1 | core: the neutral entry | `web/src/core/` (the pure code moves in, nothing is rewritten), the root `package.json`, the built `core.js` and its types, the bans | +40 | R0 |
| R2 | builders | `codegen.rs` becomes the `codegen/` folder; `gen/builders.ts`; `built()` and `share()` | +115 | R1 |
| R3 | check | `Fault` serializes; `fixtures/check/`; `gen/shapes.ts`; `check()` and `actions()` in TS | +250 | R2 |
| R4 | scoped CSS and the look | `blocks.scoped.css` from the one `blocks.css`; `gated()` and the look's CSS | +60 | R1 |
| R5 | adapter: the frame | `web/react/`: `BlocksView`, hooks, actions and confirm, local state, the island box, app kinds, the harness boot, `--adapter`, `react.yml` | +400 | R2, R4 |
| R6 | adapter: kinds 1 | screen, sheet, section, list, row, card, button, stat, text | +330 | R5 |
| R7 | adapter: kinds 2 | form, chips, images | +230 | R6 |
| later | adapter: the Mode A kinds | the other 14 kinds, filed and not queued until an app needs one | about +650 | R7 |

R3 and R4 can run side by side. `table` (#80) adds its React view in whichever of #80 and R6 lands second. The guard
kit (#79) builds on R3's `check()` and `actions()` and R4's `gated()`. Synergy's first app can start after R7.

## Where each amendment is answered

| Amendment | Where |
|---|---|
| q2222 islands follow #21's contract | `adr.md` part 7; `shapes.md` Islands; `boundaries.md` statechart 2 |
| q2229 the two modes, README's opening | above; `adr.md` part 1; slice R0 |
| q2230 json-render and A2UI tried, nothing depended on | `measured.md` parts 2 and 3; `adr.md` part 10 |
| q2253 neutral core, thin adapter, host against native, the adapter contract | `adr.md` parts 2 and 5; `measured.md` part 1; `boundaries.md` |
| q2220 tree tests per route | `usage.md` part 4 |
