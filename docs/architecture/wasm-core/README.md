# L2: the core compiled to wasm for the web client (#46)

## Summary

Decision: no-go. The wasm core passes every fixture and is fast enough, but it is 264 KB gzipped against the 2.8 KB
of TS it replaces: the bundle would grow from 20.7 KB to about 285 KB, four times React's. The blocks crate stays
one crate: a split saves 0.1% of the wasm.
Slices: none in code. One docs PR: this folder, and the L2 row of `migration.md` marked no-go; then #46 closes.
Open questions: file a follow-up that turns the sim's fixed seeds into protocol fixtures for TS and Swift?

## The numbers in one table

Measured at `d088209` with rustc 1.99.1, `opt-level = "z"`, fat LTO, `panic = "abort"`, stripped (`measured.md`).

| | raw | gzip -9 | brotli |
|---|---|---|---|
| `web/dist/blocks.js` today | 54,131 | 20,672 | 18,902 |
| the TS the core would replace (`Mirror`, `apply`, `evaluate`, `start`, `view`) | 6,794 | 2,771 | 2,554 |
| the wasm core: `patch`, `diff`, `mirror`, `eval`, `view` | 773,951 | 264,234 | 199,711 |
| the smallest useful slice: `eval`, `start`, `view` only | 165,366 | 74,053 | 63,587 |
| the same core built from a crate with no `site`, `theme`, `layout`, `tree`, `web`, `shelf` | 773,072 | | |

The core is 95 times the code it replaces. 70% of it is the derived parsing and writing of the 27 typed kinds, which
is what "the crate's own `patch` and `mirror`" means; no build tool and no crate split removes it.

## Read in this order

| File | What |
|---|---|
| `adr.md` | the question, the options, the decision, the crate split (q2193), the consequences, the `arch.toml` lines |
| `measured.md` | how each number was taken, what was not measured, and how to take them again |
| `design.md` | the design that was measured, kept for the day the numbers change: usage, shapes, boundaries, statechart |
