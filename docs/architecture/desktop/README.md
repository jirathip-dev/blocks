# L1: a Rust desktop renderer for Linux, Windows and macOS (#45)

## Summary

Decision: egui. The renderer is a new crate that draws a screen into a window the app owns; it links the blocks crate
for the stream, patching and expressions, with no second copy. A second crate is its headless harness, which draws on
the CPU with no window and no GPU. Slint fails on its licence and cannot draw a nested tree; iced has no accessibility.
Slices: six: the bones with five kinds; the harness and CI on three OSes; pixels and the perf gate; controls; forms;
app kinds, islands and styles. Eleven kinds stay fallbacks, for later issues.
Open questions: egui as a new dependency with two licence exceptions; the cap from 19,000 to 23,000; a demo window.

## The numbers in one table

Three throwaway prototypes drew the bench's 200-row screen headless on the CPU, on the fleet's Mac (`measured.md`).

| | egui 0.37.0 | iced 0.14.0 | Slint 1.19.0 |
|---|---|---|---|
| Licence | MIT or Apache-2.0 | MIT | GPL-3.0, or royalty-free with terms for every app, or paid |
| Packages added, headless | 56 | 135 | 204 built, 478 in the lock |
| Duplicate versions (`deny.toml` refuses any) | 0 | 6 | 3 |
| `unsafe_code = "forbid"` | holds | holds | fails in the generated code |
| First paint, 1440x900 | 2.7 ms | 17 ms (117 to 128 on a first run) | 36 ms |
| Repaint with a full layout | 1.2 ms | 1.7 ms | 3.4 ms |
| One row patched and repainted | 1.4 ms | 1.8 ms | 0.9 ms |
| Peak memory | 44 MB (23 without the PNG buffers) | 41 MB | 39 MB |
| Accessibility | AccessKit, with a stable id per block | none | AccessKit, with a stable id per block |
| Text | shaped; no right-to-left | shaped, right-to-left, fallback fonts | shaped, right-to-left, fallback fonts |
| A nested tree of blocks | a recursive function | a recursive function | not expressible in its language |

## Read in this order

| File | What |
|---|---|
| `usage.md` | how the callers read: an app's window, its own kinds, islands and styles, a headless run, a kind's file |
| `adr.md` | the question, the options, the decision in eleven parts, the line estimate and the cap, the consequences, the open questions, the exact `arch.toml`, `deny.toml` and `Cargo.toml` lines |
| `design.md` | the data shapes, which module may call which and what enforces it, three statecharts, the slices |
| `measured.md` | how each number was taken, what was not measured, and how to take them again |

## What was read

- blocks `staging` at `0b75a2a`: `docs/architecture/blocks/renderers.md` (the contract), `crates/blocks/src/` (`tree`,
  `behave`, `mirror`, `kind`, `built`, `theme`), `web/src/render/index.ts`, `web/shot/`, `swift/Sources/BlocksUI/Tree.swift`,
  `swift/Sources/BlocksSnapshot/`, `.drover/arch.toml`, `deny.toml`, `scripts/line-cap.sh`, `scripts/deps-gate.sh`, the
  workflows, and `docs/architecture/guard/` (in flight: it moves the harness checks into the crate).
- The sources of egui 0.37.0, iced 0.14.0 and Slint 1.19.0 as fetched from crates.io on 2026-11-19.
