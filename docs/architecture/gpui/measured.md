# What was measured, and how (#299)

Taken on 2026-11-21. Local runs: the fleet's Mac (Apple silicon, Darwin 27.2, one 100 Hz display at scale 1), rustc
1.99.1, 1-minute load average 5 to 7 (frame times taken at a load over 100 were thrown away). CI runs: GitHub-hosted
`ubuntu-latest`, `windows-latest` and `macos-latest`, by `.github/workflows/gpui-spike.yml`.

- egui 0.37.0 and eframe 0.37.0 from crates.io, with `blocks-desktop` and `blocks-desk` as they are on this branch.
- GPUI from `zed-industries/zed` at `2f808b3c` (2026-11-21), the crates `gpui` and `gpui_platform`.
- Every build is `--release` with thin LTO and one codegen unit, the workspace's own profile.

One script runs every step, on any of the three OSes. From the repo root:

```
P=docs/architecture/gpui/proto
bash $P/measure.sh build      # the four crates, each with its build time
bash $P/measure.sh size       # item 4
bash $P/measure.sh deps       # item 3: needs cargo-deny
bash $P/measure.sh bench      # item 2, no window
bash $P/measure.sh shots      # item 1 and item 5, no window
bash $P/measure.sh window     # items 2 and 6, a real window (FACE=<ttf> adds the styled egui shots)
bash $P/measure.sh probe      # item 7
bash $P/measure.sh uia        # item 7 on Windows
```

The local output is `results/macos-local.txt`; each runner's is `results/ci-<os>.txt`, cut from its job log.

## The prototype

`proto/` holds four crates, each with its own `[workspace]` and lock, none in the repo's workspace:

| Crate | What |
|---|---|
| `proto/gpui` (1,113 lines) | `blocks-gpui`: draws `screen`, `list`, `row`, `card`, `text`, `prose` and `composer` with GPUI by a switch over `Block`, every other kind as a labelled box; applies ops with `blocks::apply`; a text field with IME; a role, a name and `block:<id>` on every block |
| `proto/egui` (395 lines) | `blocks-egui`: `blocks-desktop`'s `Stage` unchanged, in a headless egui context and in an eframe window |
| `proto/min-gpui`, `proto/min-egui` | a window with one line of text, for size and the dependency tree |
| `proto/shared` | the screens and op bursts both sides draw; the text probe |

The screens: `look` is the crate's own samples (`blocks::samples()`) of `list`, `row`, `card`, `text`, `prose` and
`composer` in one screen; `rows` is a text and a 200-row list; `scripts` is Latin, Thai, Arabic, Hebrew, CJK and emoji.

`blocks-desktop` does not draw `prose` or `composer` yet (both are `TODO(#45)` gaps), so the egui side shows their
fallback, and its rows and cards have the spacing and type sizes of slice 1.

## 1. Look

`measure.sh shots`: egui through `blocks-desk` (its CPU rasteriser); GPUI through `HeadlessAppContext` and Metal.
`measure.sh window`: the Thai and right-to-left screen in a real eframe window, since only eframe adds the OS's fonts.

| File in `look/` | What |
|---|---|
| `egui-look-{1440,390}-{light,dark}.png` | `blocks-desktop` with the styled look (#303): `blocks-desk --screen look/look.json --size <390x844\|1440x900> --scheme <light\|dark>`, no app font |
| `gpui-look-{1440,390}-{light,dark}.png` | the prototype |
| `egui-look-390-{light,dark}-styled.png` | `blocks-desktop` unchanged, with the app setting a font (the OS's), type sizes, spacing and a margin on egui's context: about 30 lines in `proto/egui/src/window.rs` |
| `egui-scripts-390-light.png`, `gpui-scripts-390-light.png` (and `-2x`) | the scripts screen |
| `gpui-look-390-light-linux.png`, `gpui-scripts-390-light-linux.png` | the prototype on `ubuntu-latest`, drawn by software Vulkan |
| `gpui-look-windows.png` | the prototype in a real window on `windows-latest` (the runner's screen is 1024 wide) |

What the pictures show:

- Most of the gap between the first two rows is not the toolkit. The prototype has padding, a type scale, a card
  fill, row dividers, native `prose` and a composer; `blocks-desktop` has none of them yet. The styled egui shot
  closes the type and spacing half with no renderer change. The rest is work in `blocks-desktop`'s kind files.
- What is the toolkit: GPUI's text is the OS's own (CoreText here, DirectWrite on Windows, cosmic-text on Linux),
  in the OS's UI font with the OS's fallback fonts. egui rasterises text itself, the same on every OS, in its
  bundled font unless the app adds one. Both are sharp at scale 1.
- GPUI has shadows, gradients and dashed borders as primitives; egui has shadows and gradients through meshes.

## 2. Frame time

`measure.sh bench`: no window. One frame is everything up to the list of shapes handed to the GPU: for egui
`Context::run_ui` and `tessellate`; for GPUI `Window::draw`. `gpui+gpu` adds Metal drawing the frame and reading it
back. The 200-row screen, every row drawn (neither side draws only the rows in view). Scroll: 240 frames at 30
points a frame. Stream: 120 frames, each applying ops with `blocks::apply` first: five rows replaced, or a paragraph
that grows by a word.

Milliseconds, median (95th percentile), 1440x900; without the GPU, 390x844 is within a tenth of it
(`results/macos-local.txt`).

| | egui | GPUI | GPUI with the GPU |
|---|---|---|---|
| First paint (egui: a new context; GPUI: a new app, text system and window) | 7.6 | 41.8 | 46.9 |
| Repaint, nothing changed | 0.28 (0.34) | 1.40 (1.80) | 2.64 (2.95) |
| Scroll | 0.26 (0.31) | 1.44 (1.93) | 2.79 (3.75) |
| Stream, five rows a frame | 0.42 (0.54) | 2.72 (2.90) | 4.49 (5.84) |
| Stream, a growing paragraph | 0.44 (0.61) | 2.80 (3.15) | 5.06 (6.51) |
| Frames over 16.7 ms, of 600 | 0 | 0 | 0 |

`measure.sh window`: a real window on the 100 Hz display, the same script, 480 frames each. The gap between
frames, in ms:

| | egui (eframe, wgpu) | GPUI (Metal) |
|---|---|---|
| Scroll, median / 95th / longest | 9.99 / 10.56 / 13.16 | 10.01 / 10.06 / 11.14 |
| Stream rows | 10.01 / 10.41 / 12.07 | 10.00 / 10.06 / 10.34 |
| Stream text | 9.98 / 10.61 / 11.95 | 10.01 / 10.05 / 10.09 |
| Frames that missed a refresh | 0 | 0 |
| eframe's own CPU time a frame, median | 0.9 to 1.2 | not exposed |
| Peak memory (`/usr/bin/time -l`) | 117 MB | 106 MB |

The same `bench` on the runners, median ms at 1440x900 (`results/ci-*.txt`):

| | egui, scroll / stream | GPUI, scroll / stream | GPUI with the GPU, scroll / stream |
|---|---|---|---|
| `ubuntu-latest` | 0.72 / 1.1 | 3.7 / 7.5 to 7.9 | 6.6 / 10.5 to 11.3, on `llvmpipe` |
| `windows-latest` | 1.0 / 1.6 | 4.1 / 8.4 to 8.7 | no headless renderer |
| `macos-latest` | 0.66 / 1.1 | 3.4 / 5.9 | 12.3 / 19 to 22 on the runner's virtual GPU, two frames in five over 16.7 ms |

Both hold the display. GPUI's frame costs five to seven times egui's on the CPU, and its frame pacing is tighter.
Neither number decides anything on a real machine: the dearest frame on this Mac is under 8 ms of a 10 ms refresh,
and that includes a read-back no app does. On a runner with no GPU, GPUI's stream frames reach half a 60 Hz frame.
GPUI's extra time on a stream is the OS shaping the changed lines. Peak memory with no window: egui 19 MB, GPUI
36 MB.

## 3. Dependencies

`measure.sh deps`: `cargo tree` for three targets, and `cargo deny --config deny.toml check` (cargo-deny 0.22.0)
with this repo's `deny.toml` on each lock. "Alone" is a crate that depends on the toolkit and nothing else.

| | egui alone | eframe window | GPUI alone | GPUI window | GPUI 0.2.2 (crates.io) |
|---|---|---|---|---|---|
| Packages in the lock | 59 | 426 | 357 | 631 | 708 |
| Crates built, Linux / Windows / macOS | 54 / 54 / 54 | 280 / 179 / 178 | 249 / 254 / 247 | 441 / 263 / 303 | 536 / 443 / 450 |
| Crates in two or more versions, same order | 0 / 0 / 0 | 15 / 6 / 8 | 8 / 7 / 7 | 24 / 8 / 23 | 59 / 44 / 47 |
| `cargo deny`: licences refused | 0 | 6 | 6 | 14 | 26 |
| `cargo deny`: crates from a refused source | 0 | 0 | 12 | 34 | 0 |
| `cargo deny`: banned crates | none | `eframe`, `winit`, `wgpu` | none | `wgpu` | `tokio`, `hyper` |
| `cargo deny` overall | passes | fails | fails | fails | fails |

- **eframe window, licences refused:** BSD-2-Clause (`arrayref`), BSL-1.0 (`clipboard-win`, `error-code`), ISC
  (`libloading`), BSD-3-Clause (`tiny-skia`, `tiny-skia-path`). Its three bans are this repo's own rule that no
  crate here opens a window.
- **GPUI window, licences refused:** MPL-2.0 (`cbindgen`, `dwrote`, `option-ext`), BSD-3-Clause (`exr`, `lebe`,
  `sha1_smol`, `subtle`, `tiny-skia`, `tiny-skia-path`, and `encoding_rs` with Apache-2.0 or MIT), BSD-2-Clause
  (`arrayref`), ISC (`libloading`), Zlib (`slotmap`), CC0-1.0 (`tiny-keccak`).
- **GPUI window, sources refused:** 34 crates from five git repositories: `zed-industries/zed` (18), `gfx-rs/wgpu`
  at a pinned commit (11), `zed-industries/xim-rs` (3), `zed-industries/font-kit` (1), `zed-industries/oo7` (1).

The split matters more than the totals. `egui` alone passes `deny.toml`, which is why `blocks-desktop` can live in
this workspace and only the app's window is outside it. GPUI has no such half: `gpui` alone already fails on sources
and licences.

## 4. Release binary size

`measure.sh size`: `min-egui` and `min-gpui`, in bytes; "stripped" is after `strip`.

| | min-egui | min-gpui |
|---|---|---|
| macOS arm64, local | 12,067,888 (stripped 10,134,896) | 7,301,104 (stripped 6,009,072) |
| macOS arm64, `macos-latest` | 12,051,392 (stripped 10,118,400) | 7,301,104 (stripped 6,009,072) |
| Linux x86_64, `ubuntu-latest` | 22,415,304 (stripped 18,465,688) | 28,538,176 (stripped 23,539,512) |
| Windows x86_64, `windows-latest` | 13,662,720 | 8,930,816 |
| Build on the runner, Linux / Windows / macOS | 144 s / 194 s / 122 s | 204 s / 238 s / 233 s |

GPUI is smaller where it leans on the OS (Metal and CoreText, Direct3D and DirectWrite) and larger on Linux, where
it carries wgpu and its own text stack. eframe carries wgpu and its fonts everywhere. `min-gpui` compiles its Metal
shaders at start (`runtime_shaders`): building them needs Xcode's Metal toolchain, which this host lacks.

## 5. CI: headless, with no GPU

`measure.sh shots`, `bench` and `window` on the three GitHub-hosted runners, none of which has a GPU.

| | `macos-latest` | `ubuntu-latest` | `windows-latest` |
|---|---|---|---|
| egui: `blocks-desk` on the CPU | 4 PNGs | the same bytes | the same bytes |
| GPUI: a frame built with no window (`Window::draw`), real text | yes | yes | yes |
| GPUI: pixels with no window (`HeadlessAppContext`) | yes, through Metal | yes, through wgpu on Mesa's software Vulkan (`llvmpipe`), once `mesa-vulkan-drivers` is installed | **no**: `render_to_image not available: no HeadlessRenderer configured` |
| GPUI: pixels from a real window (`Window::render_to_image`) | yes | **no**, on X11 or Wayland: `render_to_image not implemented for this platform` | yes, if the window is shown (`look/gpui-look-windows.png`); a hidden one gives a 1x1 image |
| The same PNG bytes as on this Mac | egui yes; GPUI no | egui yes; GPUI no | egui yes |

So GPUI renders headless with no GPU on macOS and Linux, and not on Windows, where it has no headless renderer at
all. Its pixels also differ from machine to machine, where `blocks-desk`'s do not: the four egui PNGs are the same
SHA-256 from this Mac and all three runners.

What blocks would need for a GPUI renderer to pass `renderers.md` section 7:

- **The contract's text needs no change.** Section 7 is about the tree, the protocol, the expressions and the
  actions. All four can be had from `Window::draw` with a real text system and no pixels, on all three OSes.
- **Section 6's PNG is the part that moves:** from "the CPU, no window" to Metal on macOS, a software Vulkan driver
  installed in the Linux job, and a real, shown window on Windows. The PNG stops being the same on every machine.
- **`desktop.yml`** gains the Linux packages below and loses nothing; its perf step would time a software renderer.
- **A second harness crate**, outside the workspace's lock: `gpui`'s `test-support` feature is what exposes the
  headless context, and `gpui` cannot enter the workspace (section 3).

## 6. Platforms and releases

`measure.sh build` and `measure.sh window` on the runners. A window on a runner is drawn by a software renderer,
so the gaps say that it runs, not how fast.

| | Builds | Runs in a real window |
|---|---|---|
| macOS arm64 | yes: with Xcode's Metal toolchain, or `runtime_shaders` | yes, here and on the runner (60 Hz there: median gap 16.7 ms, 95th under 20; eframe the same) |
| Linux x86_64, X11 (Xvfb) | yes, after `apt-get install libxkbcommon-dev libxkbcommon-x11-dev libwayland-dev libx11-xcb-dev libxcb1-dev libfontconfig-dev` | yes, on `llvmpipe`: all 480 frames, each 48.0 ms apart |
| Linux x86_64, Wayland | the same build | yes, under headless sway on `llvmpipe`: all 480 frames, 41 ms apart. Under headless weston it panics at start: `Wayland compositor does not provide wl_seat` |
| Windows x86_64 | yes, with nothing installed | yes, on Microsoft Basic Render Driver: median gap 15.9 ms; 33 to 147 of 480 frames late over four runs, DirectComposition on or off |

eframe ran in a window on all of them too. On the Windows runner it was the slower one: 30 to 127 ms a frame
through wgpu, against GPUI's 16 through Direct3D 11. On the Linux runner it was the faster one: 3 to 16 ms.

Releases, from the crates.io API and `gh api` on 2026-11-21:

| | egui | GPUI |
|---|---|---|
| Newest crates.io release | 0.37.0 | 0.2.2, of 2025-10-22: 13 months old |
| Commits to the toolkit's folder since that release | not counted | 668 to `crates/gpui`; 154 of them in the last three months |
| Can today's source be released as it is | yes | no: `gpui` is the only crate of its tree marked for publishing, and its `wgpu` is a git commit |
| What an app pins | a version | a git commit of the whole Zed repository (428 MB to fetch) |
| What 0.2.2 lacks that the snapshot has | | AccessKit, the split into platform crates, wgpu on Linux, the headless renderers, ICU line breaking |

`gpui = "=0.2.2"` still compiles on rustc 1.99.1 (`cargo check`, with two future-incompatibility warnings). Two
third parties republish GPUI snapshots on crates.io: `gpui-pre` (0.3.13 of 2026-11-16, 14 versions in 11 weeks, one
publisher; the component library `gpui-component` pins it with `=`) and the fork `gpui-ce` (0.3.0). Neither was
built here.

## 7. Text and accessibility

`measure.sh probe` lays out fixed strings and prints where each glyph landed (`proto/shared/probe.rs`).

| | egui 0.37 (eframe window) | GPUI, macOS |
|---|---|---|
| Hebrew `אב גד`, x of each letter in reading order | 8, 0, 27, 20: each word is right to left, the words run left to right. **Wrong.** | 26, 18, 8, 0: right to left. **Right.** |
| Arabic `اب جد` | 9, 0, 22, 16: the same fault | 34, 21, 12, 0: right |
| Thai `ก` against `ก็` (a mark above) | 8.41 and 8.41: the mark sits on its base | 8.48 and 8.48: the same |
| A Thai sentence wrapped at 120 points | breaks inside the word `ว่าง` | breaks inside the same word |
| The same on `ubuntu-latest` | the same fault | right to left: **right** |
| The same on `windows-latest` | the same fault | Hebrew 0, 9, 21, 27: left to right, every letter. **Wrong**, and worse than egui: the words are spelled backwards |

- **Right to left:** egui shapes each run but never reorders the line (`TODO(emilk): heed bidi characters` in
  `epaint`). GPUI takes the order from the shaper: CoreText and cosmic-text give it; on Windows GPUI reads
  DirectWrite's glyph runs in order and ignores their direction (`bidiLevel` is never read in `direct_write.rs`).
  Neither toolkit has a paragraph direction: a right-to-left line still starts at the left edge.
- **Thai:** both shape it, on all three OSes. Neither breaks lines at Thai words. GPUI's line breaker is ICU's
  without the Thai dictionary (`LineSegmenter::new_for_non_complex_scripts`), so a Thai line breaks where it runs
  out of room; on the Linux runner that happened to fall between two words.
- **Fonts:** both find the OS's fonts for Thai, Arabic, Hebrew, CJK and emoji with no font added by the app
  (`look/*-scripts-*.png`). For egui that is eframe's doing; `blocks-desk`, which has no eframe, needs `--font`.
- **IME (read, not typed: a lane has no keyboard):** GPUI wires the OS's input methods on all four back ends
  (NSTextInputClient, IMM32, XIM, Wayland text-input-v3) but ships no text field; an app implements
  `EntityInputHandler` (`proto/gpui/src/field.rs`). egui's `TextEdit` handles IME itself.
- **Selecting and copying shown text:** egui's labels do it by default. GPUI has nothing for it.
- **AccessKit:** egui builds it in. GPUI has it at this snapshot only: adapters for macOS, Windows and Linux, on by
  default, and `.role()`, `.aria_label()` and `.accessibility_id()` on any element with an id. A plain element has
  no role until it is given one; lists and images have none of their own. GPUI 0.2.2 has no accessibility at all.
- **What Windows sees (`measure.sh uia` on `windows-latest`):** UI Automation finds all 11 blocks of the samples in
  each window by `block:<id>`, with a control type and a name. GPUI: 12 nodes (`List`, `ListItem`, `Group`,
  `Document`, and the composer's `Edit`). egui: 31 nodes (every block a `Group`, plus each text).

## Not measured

- A real input method, and a real screen reader, on any OS.
- A real GPU on Linux or Windows, and a desktop's own Wayland compositor: the runners have neither, so their
  frame times are a software renderer's.
- A display at scale 2 for egui (`blocks-desk` draws at scale 1; this host's display is scale 1).
- `gpui-pre`, `gpui-ce` and `gpui-component`: read on crates.io, not built.
- Lists past 200 rows. GPUI ships two lists that draw only the rows in view; egui has one for rows of equal height.
