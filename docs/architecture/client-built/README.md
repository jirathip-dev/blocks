# client-built: screens built by the app's own Rust, drawn from local code (#354)

## Summary

Decision: the crate needs no change: it builds for wasm32 and iOS as it is, with no feature. The web shell gets one
seam, a source: `mount` draws a server's stream or the app's own code the same way. BlocksUI already takes a screen
and gives actions back, so it gets a test, no new code. The example is a small Rust app with no new dependency.
Slices: one PR: two CI gates, the web source seam, the example (`demo/client`), the Swift test, one docs page.
Open questions: the example's wasm is 297 KB gzipped and 172 KB of that is one check inside `diff`. File a
follow-up that slims the check (floor measured: 125 KB)? Recommended: yes, as its own issue.

## Read in this order

| File | What |
|---|---|
| `usage.md` | how the callers read: the app's Rust, its wasm glue, the page, the Swift view, a push, the tests |
| `adr.md` | the question, what exists, the options, the decision in nine parts, what stays the app's job, consequences, the open question, hot files, the `.drover/arch.toml` lines |
| `shapes.md` | the layout, the TS types (`Source`, `Local`, `Refused`, `Mount`), the example's exports, the fixtures, the two gate files |
| `boundaries.md` | which module may call which and what enforces it, and the statechart of one local screen |
| `measured.md` | what was built and run: the two targets, the wasm sizes and where the bytes go, the glue run in node, what was not measured |

## The mode in one table

| | Mode A, server-driven | Mode B in TS (#81) | Mode B in Rust (this ADR) |
|---|---|---|---|
| Who | drover, cooee | the client app | Sendmeter |
| The screen is built by | a Rust server | TS builders in a route loader | the app's own Rust: wasm in the page, native behind its FFI on iOS |
| It changes by | row ops over the device stream | the loader running again: a new screen | row ops from `diff`, handed over by local code |
| Drawn by | the HTML shell, SwiftUI, the static site | the React adapter | the HTML shell and SwiftUI, the same entry points as Mode A |
| Uses | everything | kinds, builders, check | kinds, builders, `diff`, `Action`, `Answer`; no shelf, mirror, stream or wire versioning |

## One picture

```text
the app's Rust     Meter { state, the screen last handed out }
                     screen() -> Block            act(Action) -> Answer { ops: diff(last, next) }
                        │ JSON text                                  │ JSON text
the app's glue     wasm exports in the page            its own FFI on iOS            (the app's job)
                        │                                            │
blocks             local({ screen, act }) -> Source        Block.apply(ops)          (holds the screen, applies the ops)
                        │                                            │
                   mount({ sources: { meter } })        BlocksView(screen, act:)     (the entry points Mode A uses)
```
