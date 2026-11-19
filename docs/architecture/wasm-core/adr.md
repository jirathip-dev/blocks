# ADR: the core compiled to wasm for the web client (#46, L2)

## Summary

Decision: no-go. The wasm core passes every fixture and is fast enough, but it is 264 KB gzipped against the 2.8 KB
of TS it replaces: the bundle would grow from 20.7 KB to about 285 KB, four times React's. The blocks crate stays
one crate: a split saves 0.1% of the wasm.
Slices: none in code. One docs PR: this folder, and the L2 row of `migration.md` marked no-go; then #46 closes.
Open questions: file a follow-up that turns the sim's fixed seeds into protocol fixtures for TS and Swift?

## Question

The client logic exists in Rust and again in TS: `Mirror` in `stream.ts`, `apply` in `patch.ts`, `evaluate`, `start`
and `view` in `behave.ts`, held equal by `fixtures/protocol` and `fixtures/behave`. Should the web client call the
Rust instead, compiled to wasm? And (q2193) should the crate be split so the wasm carries less?

## What was measured

A prototype built the five modules to wasm from the crate as it is, ran both fixture folders through it and timed
it in headless WebKit on the 200-row screen. `measured.md` has the method and every number.

| | Today (TS) | Through wasm |
|---|---|---|
| `fixtures/protocol` (69 checks), `fixtures/behave` (62 cases) | pass | pass, the same values |
| the logic's size, gzipped | 2.8 KB | 264 KB |
| the whole script, gzipped | 20.7 KB | about 285 KB as a second file, 378 KB inlined as base64 |
| start-up | none | 2 ms to instantiate (2 to 4) |
| the first 200-row screen taken | under 1 ms | 2 ms (2 to 4) |
| 120 patch frames on a fresh page | 14 ms (14 to 15) | 19 ms (17 to 21) |
| non-test lines | | about 300 of TS out, 60 of glue and 100 of Rust in: net about -140 |

Speed is not the problem: first paint would gain 4 to 8 ms against a 300 ms budget. Size is. Of the wasm's code, 56%
parses the typed kinds and wire types, 14% writes them and 14% is the logic itself; the rest is std and serde_json.

## Options

| | Option | Script, gzipped | Verdict |
|---|---|---|---|
| A | all five modules in wasm, as the issue asks | 20.7 KB to about 285 KB | no: 14 times the bundle for 2.8 KB of logic |
| B | only `eval`, `start` and `view` in wasm; `Mirror` and `apply` stay TS | 20.7 KB to about 93 KB | no: still over React's 69 KB, and two of the three files stay doubled |
| C | a second, untyped `patch` and `mirror` in Rust over plain JSON, so the kinds stay out of the wasm | not built; it holds all of B, so over 93 KB | no: it moves the double from Rust and TS to Rust and Rust |
| D | keep the TS; the fixtures hold it equal | 20.7 KB | **chosen** |

What could shrink A, and why it does not change the verdict: `wasm-opt` and a std rebuilt without its panic text
were not measured (the first needs an install, the second a nightly toolchain). Their usual gain together is 15
to 30%, an estimate; a third off would still leave about 180 KB, nine times today's bundle. Parsing through
`Value` first was measured: 5% smaller.

## Decision

1. **No-go.** `stream.ts`, `patch.ts` and `behave.ts` stay. The numbers above are the record the issue asks for.
2. **The reason is one fact:** the Rust core is typed, and reading and writing the 27 typed kinds and the wire
   types compiles to about 500 KB of wasm. The TS works on plain objects and needs none of it. So the cost comes
   with the design the repo chose on purpose (one typed source), not with a tool or a flag.
3. **What the duplicate costs today is small and bounded:** about 300 lines of TS, checked by 11 protocol
   fixtures (69 checks) and 62 behave cases that Rust, TS and Swift all run. Swift keeps its own port whatever
   the web does, so wasm would take the count of implementations from three to two, never to one.
4. **Revisit only if** the same prototype measures under about 20 KB gzipped, the size of today's whole bundle.
   `design.md` keeps the measured design so that day starts from it. L1, the desktop renderer, is untouched: it
   links the crate natively and needs no wasm.

## The crate split (q2193)

**Keep one crate, no new cargo features.** The split was weighed for what it would buy the wasm:

| Built from | wasm, raw bytes |
|---|---|
| the crate as it is | 773,951 |
| the crate with `site`, `theme`, `layout`, `tree`, `web` and `shelf` compiled out | 773,072 |

The linker already drops what the exports do not reach: a split saves 879 bytes, 0.1%. Against that it would cost
each app a pin line per crate it uses, all kept at one sha (or a facade crate to hide them), three manifests under
`deny` and the deps gate, and layer rules moved from `arch.toml`, where they are checked today, into crate edges.
Features in one crate would cost a `features = [...]` list in each app's pin and a CI build with them off, for the
same 0.1%.

Consequences for drover and cooee: none. The pin stays one line, `blocks::web::JS` stays the same file, no
feature list, no CSP change, no new route.

## Consequences

- #46 closes on the owner's approve, with this folder as its record. No code changes, no cap change (13,336 of
  13,500 today), no new dependency, no build tool to pick: the ask in the issue's notes falls away.
- `migration.md`'s L2 row is marked no-go with a link here. That file is outside this lane's folder, so it is the
  one line of the docs PR.
- The drift risk the issue names stays, held by fixtures. The cheapest way to tighten it reaches Swift too, which
  wasm never would: write the sim's fixed seeds out as generated `fixtures/protocol` files, which the TS and Swift
  runners already read. That is a new issue, so it is the open question below, not part of this one.
- `docs/bench.md`'s script-size line (a fifth of React's) stays true.

## If the owner overrules: go

`design.md` is the design to build. In short, and each a cost the go would carry:

- **Build tool:** `wasm-bindgen`, the crate and its CLI pinned to one version, in a leaf crate `crates/blocks-wasm`
  that nothing depends on. It is the only route that keeps `unsafe_code = "forbid"`: the prototype compiled under
  the workspace lints. A hand-written export needs `#[no_mangle]` and raw pointers, which the lint refuses. Two
  dev installs (the `wasm32-unknown-unknown` target, the CLI) on every dev host and in CI's `gen` job.
- **How `web/dist` carries it:** a second generated file, `web/dist/blocks.wasm`, and `blocks::web::WASM`. Each
  host serves it beside the JS and hands `mount` its URL: one new route in drover and in cooee. Inlining it as
  base64 keeps one file but costs 93 KB more gzipped.
- **Where wasm cannot load** (Safari in Lockdown Mode; a page whose CSP lacks `wasm-unsafe-eval`): no second TS
  core. The stream asks for the whole screen on every frame and redraws; behaviours do not run and the server's
  own checks answer a submit, as on a static page.
- **The generated-drift gate:** the wasm embeds seven host paths (cargo's registry), so the build needs
  `--remap-path-prefix`; that a Mac and CI's Linux then give the same bytes is not measured and not promised by
  rustc. If they differ, the gate cannot hold the file.
- **For drover and cooee:** the script they serve grows 14 times; a host with a CSP adds `wasm-unsafe-eval`.

## Open questions

1. File the follow-up (the sim's fixed seeds as generated protocol fixtures, and random expressions as a
   `fixtures/behave` file, for TS and Swift)? It answers the issue's Problem at no bundle cost. Recommended: yes.

## `.drover/arch.toml` lines

None. No hot file is converted and no generated file is added: `web/dist/blocks.js` is already under `generated`
and keeps its generator, `just gen`. The lines a go would add are in `design.md`.
