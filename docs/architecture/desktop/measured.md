# What was measured, and how (#45)

Taken on 2026-11-19 on the fleet's Mac (Apple M6, 12 cores, 32 GB, macOS 27.2, `aarch64-apple-darwin`) with rustc
1.99.1, against egui 0.37.0, iced 0.14.0 (iced_widget 0.14.2, iced_tiny_skia 0.14.1) and Slint 1.19.0, each the
newest release on crates.io that day.

**The host was busy the whole time**: the 1-minute load average was never under 10 and passed 100. Every time
below is noisy. Read the order between the toolkits, not the last digit.

## The prototypes

Three scratch crates outside the repo (`/tmp/blocks-l1/<toolkit>/`), never committed, each depending on
`crates/blocks` by path, each built by its own subagent to one written spec, with `unsafe_code = "forbid"` asked
for. Each has a binary `proto --size <W>x<H> --out <dir>` (release, thin LTO, one codegen unit) that:

1. builds the bench screen as a `blocks::Block`: a title and 200 rows, each a title, a subtitle, a value and a tap;
2. draws it by a switch over `Block` (the screen, the row, every other kind as a one-line fallback), with the
   colours of `theme::default().light`, all 200 rows for real, not through a list that draws only the rows in view;
3. paints the viewport on the CPU, with no window, GPU or display server, and writes a PNG;
4. writes the drawn tree as a `tree::Node` with a rect for every row, the rows out of view included;
5. taps row `r3` by id with real pointer events and records the `Action` it sends; types into one field by id;
6. applies a `Merge` to `r7` with `blocks::apply` and repaints.

All three did all six. Each PNG was opened and looked at.

## Times

Milliseconds. "Own runs": each prototype's own serial runs, 5 or 6 fresh processes, at a load average of 11 to 14;
the cell is the median. "Rerun": one interleaved pass by the architect, 9 fresh processes per toolkit and size in
turn, at a load average of about 100; the cell is the median, with the lowest in brackets.

| 1440x900 | egui | iced | Slint |
|---|---|---|---|
| first paint, own runs | 2.7 | 17.2 | 36.2 |
| first paint, rerun | 4.7 (3.0) | 27.5 (17.0) | 65.6 (49.2) |
| repaint with a full layout, own runs | 1.22 | 1.72 | 3.35 |
| repaint with a full layout, rerun | 1.8 (1.0) | 3.7 (2.1) | 4.9 (4.0) |
| of it, layout / raster, own runs | 0.44 / 0.77 | 0.10 / 2.00 | 2.58 / 0.86 |
| one `Merge` and a repaint, own runs | 1.39 | 1.83 | 0.85 |
| one `Merge` and a repaint, rerun | 2.0 (1.1) | 3.1 (2.1) | 1.1 (0.8) |

| 390x844 | egui | iced | Slint |
|---|---|---|---|
| first paint, own runs | 2.1 | 13.0 | 30.9 |
| first paint, rerun | 3.9 (2.2) | 24.2 (18.3) | 53.1 (40.0) |
| repaint with a full layout, own runs | 0.76 | 0.92 | 3.16 |
| one `Merge` and a repaint, own runs | 0.81 | 0.96 | 0.74 |

What "a repaint with a full layout" is in each:

- **egui** lays out every block on every pass; that is its normal repaint. Shaped text is cached between passes;
  with that cache missed for all 601 labels a pass is 1.8 ms. After a pass with no input it asks for no further
  one. Layout is linear in the blocks on the screen: 0.9 ms at 200 rows, 6.3 ms at 2,000, 113 ms at 20,000 (one run
  each, at load 287).
- **iced** builds the view again, matches it to the kept widget state and lays it out (0.1 ms, text cached; 0.7 ms
  with the state emptied), then paints every pixel: nine tenths of its time is the raster.
- **Slint** keeps its layout between paints: an unchanged screen repaints in 0.35 ms and a one-row patch
  rasters one row. The figure in the table forces every text and layout to be worked out again.

First paint: iced's is the OS font scan (930 faces, 8 to 18 ms; 113 to 124 ms on the first run after a build), with
no way to turn it off. Slint's is its platform and component start (27 to 31 ms). egui parses its three bundled
fonts.

In a windowed app the GPU does the raster, so the renderer's own share of a frame is the layout row.

## Memory, size, build

| | egui | iced | Slint |
|---|---|---|---|
| peak RSS, 1440x900 (`/usr/bin/time -l`) | 43.6 MB; 22.7 MB with no PNG and no kept frame copies | 40.6 MB | 39.4 MB |
| peak RSS, 390x844 | 22.1 MB; 14.6 MB | 26.0 MB | 32.4 MB |
| `proto`, stripped | 5.3 MB | 4.8 MB | 9.0 MB |
| clean release build, two jobs | 59 s | 70 s | 145 s |

The egui prototype writes uncompressed PNGs and keeps frame copies, which is most of its first figure.

## Dependencies

From `cargo metadata` and `cargo tree -d --target <t>` for `x86_64-unknown-linux-gnu`, `x86_64-pc-windows-msvc` and
`aarch64-apple-darwin`. "Beyond blocks' own" leaves out `blocks` and the eleven crates it already brings.
`cargo deny` is not installed on this host and was not run.

| Headless build | egui | iced | Slint |
|---|---|---|---|
| packages in the lock beyond blocks' own | 56 | 135 | 478, of which 204 to 212 are built |
| crates in two or more versions, per target | 0 / 0 / 0 | 6 / 6 / 6 | 3 / 3 / 3 |
| which | none (a second `syn` is in the lock under `cfg(any())`, built on no target) | `skrifa`, `read-fonts`, `font-types`, `rustc-hash`, `syn`, and `miniz_oxide` through `png` | `hashbrown` (three), `miniz_oxide`, `syn` |
| licences outside MIT, Apache-2.0, Unicode-3.0 | Zlib: `foldhash`. OFL-1.1 and Ubuntu-font-1.0: `epaint_default_fonts`, gone with the `default_fonts` feature off | BSD-3-Clause: `tiny-skia`, `tiny-skia-path`. BSD-2-Clause: `arrayref`. Zlib: `slotmap` | Slint's three-way licence on 9 crates. Zlib: `foldhash`, `slotmap`. ISC: `libloading` (Linux) |
| window, GPU or display crates | none | `softbuffer`, `raw-window-handle`; `objc2-*` on macOS, `windows-sys` on Windows | none; it links AppKit on macOS and needs fontconfig on Linux |
| banned by `deny.toml` | nothing | `tokio` is in the lock (a wasm-only path) | nothing |

| A windowed app (resolved only, never built or run) | egui (eframe defaults) | iced (defaults) | Slint (defaults) |
|---|---|---|---|
| packages in the lock beyond blocks' own | 418 | 373 | 545 |
| duplicated crates, Linux / Windows / macOS | 12 / 5 / 8 | 14 / 10 / 11 | 13 / 5 / 9 |
| licences outside the allow-list | 6 expressions, on 11 crates | 6 (BSD-3-Clause, BSD-2-Clause, Zlib, BSL-1.0, CC0-1.0, ISC) | Slint's on 11 crates, and 6 more (Zlib, ISC, BSD-3-Clause, BSD-2-Clause, BSL-1.0, Unlicense) |

Checked alone: `png = "0.18"` in an empty crate resolves `miniz_oxide` 0.8.9 and 0.9.1.

## Other findings the decision rests on

- **CPU painters for egui.** `egui_software_backend` 0.0.3 needs egui 0.34; `hdrshot-egui-backend` 0.2.0 is one
  app's private port of it and adds a second `syn`; `dream-soft-render` 2.0.0 refuses any surface over 1280x720.
  The prototype's own rasteriser is 238 lines and gives the same pixels as all three that ran (0 pixels differ), on
  this screen: straight edges, hairlines and text. Rounded and slanted shapes were not compared.
- **egui_kittest** (read, not built): its snapshot renderer is wgpu only; its queries are AccessKit's.
- **egui and AccessKit**: with it on, the 200-row screen gives 1,608 nodes; 200 of 200 rows carried `block:<id>`,
  the rows out of view included; a click action on an off-screen row's node sent its action. It adds about
  0.3 ms a pass. One gap: a tappable area made from a `Ui` gets no bounds, so the wrapper sets them (15 lines).
- **egui under the repo's lints**: `forbid(unsafe_code)` holds; the drawing code has no hit under the denied
  clippy lints; the rasteriser has 32 (`as` casts and indexing), so the real one needs checked or fixed-point maths.
- **egui text** (read from the sources): shaping by harfrust since 0.35; no bidi (`TODO(emilk): heed bidi
  characters`); colour emoji behind an epaint feature; a missing glyph is a box unless the app adds a font.
- **iced**: no `accesskit` in any iced crate, no feature for it, nothing in the changelog. Its test crate's
  snapshot is fixed at scale 2 with private pixels, so the harness sat one level down, on public API. A text sample
  drew Arabic, Hebrew, CJK, Devanagari and colour emoji right, and Thai as boxes.
- **Slint**: a component that holds itself is `Unknown element`; a struct that holds itself is `Unknown type`. A
  nested tree drew through the experimental `ComponentContainer` (each node its own globals, positions relative to
  the node) and through the interpreter (a 21 MB binary, 30 to 44 ms to recompile per patch). Under
  `unsafe_code = "forbid"` the generated code fails with six `E0453`; it compiles under `deny`. The royalty-free
  licence asks every app for an About widget or a public badge, bars embedded use, and does not allow the software
  to be distributed "alone and without integration into an Application".
- **Lines of drawing code** for the same screen: egui 215 of Rust (15 of them the accessibility id and bounds);
  iced 119 of Rust; Slint 139 of `.slint` and 80 of Rust.

## Not measured

- Anything on Linux or Windows: no build, no run. The three-target figures are dependency resolution only.
- Pixel equality across OSes or CPU architectures.
- Any real window: GPU frame times, IME, a scale factor other than 1, a real screen reader.
- Right-to-left and complex-script text in egui (read from its sources, not drawn).
- An idle host.
- `cargo deny` itself.

## Taking them again

The scratch folders are not kept. To repeat: one crate per toolkit that depends on `crates/blocks` by path and does
the six steps above; `first_paint_ms` from holding the parsed `Block` to holding the pixels, in a fresh process;
the median of 20 repaints and of 20 `Merge`-and-repaint rounds in process; `/usr/bin/time -l` for the memory;
`cargo tree -d --target <t>` and `cargo metadata` for the tree. Under a lane, a cargo target folder must be under
`$DROVER_SCRATCH_TARGET`: the hook refuses one under `/tmp`.
