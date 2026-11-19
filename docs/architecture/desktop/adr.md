# ADR: a Rust desktop renderer for Linux, Windows and macOS (#45, L1)

## Summary

Decision: egui. The renderer is a new crate that draws a screen into a window the app owns; it links the blocks crate
for the stream, patching and expressions, with no second copy. A second crate is its headless harness, which draws on
the CPU with no window and no GPU. Slint fails on its licence and cannot draw a nested tree; iced has no accessibility.
Slices: six: the bones with five kinds; the harness and CI on three OSes; pixels and the perf gate; controls; forms;
app kinds, islands and styles. Eleven kinds stay fallbacks, for later issues.
Open questions: egui as a new dependency with two licence exceptions; the cap from 19,000 to 23,000; a demo window.

## Question

blocks draws in HTML and in SwiftUI. Which Rust toolkit draws it on a Linux, Windows or macOS desktop with no HTML and
no JS; where does that renderer live so that an app without it links none of it; how is it held to `renderers.md`
section 7 on three OSes in CI; and what does it cost in lines?

## What was measured

One throwaway prototype per toolkit, outside the repo: the bench's 200-row screen as a `blocks::Block`, drawn by a
switch over `Block`, headless on the CPU, with the drawn tree, a tap by block id, typing into a field and a `Merge`
through `blocks::apply`. All three met every item. `measured.md` has the method and every number.

| | egui 0.37.0 | iced 0.14.0 | Slint 1.19.0 |
|---|---|---|---|
| Platforms | Linux, Windows, macOS | the same | the same |
| Licence | MIT or Apache-2.0 | MIT | GPL-3.0-only, or royalty-free with terms that pass to every app, or paid |
| Headless on the CPU | the `egui` crate alone; no CPU painter is maintained, so 240 lines of our own | public API under its test crate; a window-buffer crate comes along | public API; Linux needs fontconfig, macOS links AppKit |
| Packages added, headless | 56 | 135 | 204 built, 478 in the lock (winit and wgpu named, never built) |
| Duplicate versions, on each of three targets | 0 | 6, five from iced and its text stack | 3 |
| Licences outside `deny.toml` | Zlib (1 crate); two font licences, in a feature the renderer leaves off | BSD-3-Clause, BSD-2-Clause, Zlib; `tokio` in the lock | Slint's own on 9 crates, Zlib, ISC |
| `unsafe_code = "forbid"` | holds | holds | fails: the generated code needs `allow(unsafe_code)` |
| Text | shaped (harfrust); no right-to-left; labels select; IME | shaped, right-to-left, fallback fonts; labels do not select; scans every OS font on first use | shaped, right-to-left, fallback fonts; IME |
| Accessibility | AccessKit built in; one call gives a block the id `block:<id>` | none in any iced crate | AccessKit; `accessible-id` gives the same id |
| A nested, data-driven tree | a recursive function | a recursive function; state follows position, islands need type-erased messages | not expressible: a component cannot hold itself |
| Maturity | 0.x, four breaking releases in seven months; Rerun ships on it | 0.x, "experimental" in its README, three breaking releases in 22 months | 1.x, stable API |
| First paint, 1440x900 | 2.7 ms | 17 ms; 117 to 128 on a first run | 36 ms |
| Repaint with a full layout | 1.2 ms (layout 0.4) | 1.7 ms (layout 0.1) | 3.4 ms (layout 2.5) |
| One row patched and repainted | 1.4 ms | 1.8 ms | 0.9 ms |
| Peak memory | 44 MB; 23 without the harness's PNG buffers | 41 MB | 39 MB |
| A windowed app's tree (resolved, not built) | 418 packages, duplicates on every target | 373, duplicates on every target | 251 to 351, duplicates on every target |

Speed and memory do not decide it: every toolkit paints the screen in at most a fifth of a 16.7 ms frame, on one
core, with no GPU, in under 45 MB.

## Options

| | Option | Verdict |
|---|---|---|
| A | **egui** | **chosen**: the only tree that passes `deny.toml` nearly as it stands, the only one whose headless build names no window crate, and its immediate mode is the contract's own shape: one function per block, called again after every op |
| B | iced | no: no accessibility, so `renderers.md` 2b (stable ids) and the role and name in the tree (#91) have nothing to hold on to; six duplicate versions that are iced's own |
| C | Slint | no: its licence is outside `deny.toml` and puts terms on every app built on the renderer; a nested tree needs an experimental feature or a 30 ms recompile per patch; a fourth hand-written language; `forbid(unsafe_code)` cannot hold |

Smaller choices, each decided:

| Choice | Options | Chosen | Why |
|---|---|---|---|
| Where it lives | a feature of `blocks`; crates in this workspace; a folder with its own lock, like `bench/` | two workspace crates | a feature would put egui in the blocks crate's manifest (AC 4); its own lock would leave it outside deny, clippy and the cap |
| Who opens the window | this repo, with eframe; the app | the app | eframe's tree has duplicates on every target and six licence expressions outside `deny.toml`; the web and Swift renderers also draw into what the app hands them |
| The harness | egui's test crate `egui_kittest`; `egui` alone | `egui` alone | kittest's snapshots need wgpu, so a GPU or a software one in CI, and four more crates; the prototype did the whole contract on `egui` |
| The PNG | the `png` crate; our own writer | our own, about 130 lines | `png` 0.18 brings two versions of `miniz_oxide`, which `deny.toml` refuses |
| The expected trees | committed files, as HTML and Swift have; worked out in process | in process | the harness links the crate, so it calls `tree::expect` itself: no generated file, no edit to `codegen.rs` |
| Long lists | draw every row; draw only the rows in view | every row | the tree needs every rect; 200 rows lay out in 0.4 ms, 2,000 in 6 ms. A screen past that is a later issue |

## Decision

1. **egui 0.37, one new direct dependency.** Both new crates use it; the `blocks` crate never does.
2. **Two crates in this workspace.** `crates/blocks-desktop` is the renderer, a library. `crates/blocks-desk` is
   its harness: the `Desk` test API and the `blocks-desk` binary. An app pins `blocks-desktop` only if it draws on
   a desktop; a server or a web app links nothing of it.
3. **The app owns the window, the transport and the clock.** `Stage::show(ui, kit, unix_now)` draws one screen into
   the `Ui` it is handed and returns what the user did as `Event`s. The renderer stays under the crate bans: no
   file, clock, process or socket.
4. **It links the crate and copies nothing.** The app's stream goes through `Mirror`; the harness applies ops with
   `apply`; `Stage` gets what is hidden, disabled or failing from `behave::view`, and each block's role and name
   from `tree`. The layers keep `behave` and `expr` out of every view.
5. **One switch over `Block`, one file per core kind, all 27 from the first slice.** A kind's file holds its view
   or `None`. `None` is a gap: it draws the fallback and leaves the kind out of the list of drawn kinds.
6. **Every block goes through one wrapper.** It hides, applies the app's style wrap, sets the accessibility role,
   name and id (`block:<id>`, `action:<action>`: the names SwiftUI uses), and records the drawn tree with rects.
7. **Looks come in through `Scheme`, `Style` and the `Theme` port.** `Look` holds the pair and the style;
   `Art` is the port (`Plain` by default, a pack's words through `Pack`). The renderer holds no colour of its own.
8. **Apps extend it without editing it.** `Kit` registers app kinds, islands and per-kind wraps. A name nobody
   registered draws the fallback; an app kind named like a core kind is refused when it is registered.
9. **The harness draws on the CPU.** It runs egui with no window, turns egui's triangles into pixels with its own
   rasteriser and writes the PNG itself. Same flags, same files and same checks as the other two harnesses.
10. **Conformance is section 7, on three OSes.** A new `desktop.yml` runs on Linux, Windows and macOS: the two
    crates' tests, the crate's own `protocol` and `behave` tests on that OS, then `blocks-desk --check` on every
    `fixtures/blocks` and `fixtures/stress` file. `fixtures/protocol` and `fixtures/behave`'s view cases also run
    through `Stage` and must end in the crate's results.
11. **Not in this issue:** the eleven gap kinds; a window in this repo; the layout slots; drawing only the rows in
    view; right-to-left text, which egui does not lay out; an SVG reader for a pack's sprites.

## The line estimate and the cap

| | Lines |
|---|---|
| The renderer's frame: stage, wrapper, recorder, look, art, text, taps, fallback, islands, the switch | 1,230 |
| 16 kinds drawn: `screen`, `sheet`, `section`, `list`, `row`, `card`, `button`, `text`, `stat`, `chips`, `choice`, `form`, `config`, `secret`, `run`, `island` | 1,320 |
| The harness: `Desk`, steps, checks, CLI (370); rasteriser, PNG writer, timings (490); typing, the echo island (80) | 940 |
| The eleven gap files and the kit's hooks | 90 |
| #45 in all, good to one part in ten | 3,580 |
| Later issues, the eleven gap kinds | about 1,350 |

An estimate, not a measure. Its anchors: the prototype's simple `row` took 68 lines, its screen 34, its rasteriser
238 and its harness 669; SwiftUI's 21 kinds take about 3,100 lines with their frame. The desktop writes no `patch`,
`mirror` or `eval`.

`drover cap blocks` at staging `0b75a2a`: 16,464 of 19,000 lines, open PRs +46, and four other queued issues with
no PR. The ask: raise the cap by this issue's own size with its margin, **19,000 to 23,000**, so the queue keeps
the 2,490 lines of headroom it has today.

## Consequences

- **An egui release is a breaking change for desktop apps.** An app's eframe must be the minor this renderer was
  built on. egui made four breaking releases in seven months, so each upgrade is an issue of its own; the harness
  on three OSes is its gate.
- **Right-to-left text draws wrong** until egui lays it out. `docs/desktop.md` says so. The other two renderers
  are unaffected.
- **The renderer ships no font.** An app gets fonts from eframe. The harness embeds egui's default fonts so its
  passes are the same on three OSes; that is the font licence exception below.
- **PNGs are not compared across OSes.** Whether egui's glyph raster gives the same bytes on x86_64 and aarch64
  was not measured. The gate is the tree, the sizes and the ids; the PNG is for eyes.
- **The lock grows by 56 packages** and CI's `rust` job builds egui (59 s here at two jobs, clean).
- **A real window is seen nowhere in this repo.** IME, scale factors other than 1 and the OS accessibility bridge
  are egui's and eframe's code, exercised only in an app. Open question 3.
- **guard (#79)** moves the harness checks into the crate. When its probes land, `blocks-desk` reports what it
  measured like the other two and its own `fit.rs` goes.
- **compat** gains nothing yet: the last release's `blocks-desk` runs on today's fixtures once a release carries it.
- `migration.md`'s L1 row gets a link here, in S1. The web and SwiftUI renderers do not change.

## Open questions

1. **egui as a new direct dependency**, with these `deny.toml` changes (below): the Windows target; `Zlib`
   allowed for `foldhash`, which every egui build links; the two font licences allowed for egui's default fonts
   crate, which only the harness turns on. Recommended: yes. Without the font exception the harness takes a font
   file by flag and each CI runner passes its own system font.
2. **The cap: 19,000 to 23,000.** Recommended. Or 24,500, which also covers the eleven gap kinds' issues.
3. **A demo window.** A small eframe app can only live outside the workspace's lock, as `bench/` does. Options:
   a follow-up issue right after S6 (recommended), a seventh slice of #45, or none.

## Hot files

- The list this renderer would have grown, a switch and a list of drawn kinds that every kind PR edits (as
  `web/src/render/index.ts`, 12 PRs in 14 days), is a folder from the start: `crates/blocks-desktop/src/draw/`,
  one file per kind, read by `draw.rs`. A PR that draws a gap kind edits its one file. `draw.rs` changes only
  when the crate gains a core kind, so it is not frozen: that PR must add its arm.
- No generated file is added. `codegen.rs` (15 PRs in 14 days) is not touched.
- CI and docs are per area: `.github/workflows/desktop.yml` and `docs/desktop.md`, not `ci.yml` or the README.
- S1 makes every edit to a shared file, once: the lines below, `just desktop` and its name in `just check`, one
  README line, the layer names in `.drover/rules.md`. S2 adds `desktop.yml`; S6 adds `desktop` to `release.yml`'s
  list. No other slice and no gap-kind issue touches a shared file.

## The `deny.toml`, `Cargo.toml` and `docs/deps.md` lines S1 adds

`deny.toml` (`cargo deny` is not installed on this host, so these were not run: S1's first push is the proof):

```toml
[graph]
targets = ["x86_64-unknown-linux-gnu", "aarch64-unknown-linux-gnu", "aarch64-apple-darwin", "x86_64-pc-windows-msvc"]

[[licenses.exceptions]]
crate = "foldhash"
allow = ["Zlib"]

[[licenses.exceptions]]
crate = "epaint_default_fonts"
allow = ["OFL-1.1", "Ubuntu-font-1.0"]

# added to [bans] deny
{ crate = "eframe", reason = "the window is the app's, never this workspace's" },
{ crate = "winit", reason = "the window is the app's, never this workspace's" },
{ crate = "wgpu", reason = "the harness draws on the CPU" },
```

The font exception goes in with S2, when the harness turns that feature on. `cargo tree -d` is empty for the
headless tree on all three targets. The lock does name a second `syn`, under a `cfg(any())` that no target builds;
if `cargo deny` counts it, the fix is one `skip` entry for it, with that reason.

`Cargo.toml`, and one line in `docs/deps.md`:

```toml
[workspace]
members = ["crates/*", "site"]

[workspace.dependencies]
egui = "0.37"                  # blocks-desk adds `features = ["default_fonts"]`; blocks-desktop adds none
```

```
- `egui`: the desktop renderer's toolkit, in `blocks-desktop` and `blocks-desk` only; never in the `blocks` crate
```

`scripts/deps-gate.sh` reads every `crates/*/Cargo.toml`, so it must skip this workspace's own crates (`blocks`,
`blocks-desktop`) rather than list them as dependencies.

## The `.drover/arch.toml` lines S1 adds

`.drover/arch.toml`: the layers and bans were run through `drover arch-check` on a scratch copy, clean and with
one breach of each rule.

```toml
[[layer]]
name = "desktop-look"
paths = ["crates/blocks-desktop/src/look.rs", "crates/blocks-desktop/src/art.rs", "crates/blocks-desktop/src/text.rs"]
mods = ["crate::look", "crate::art", "crate::text"]

[[layer]]
name = "desktop-cx"
paths = ["crates/blocks-desktop/src/cx.rs", "crates/blocks-desktop/src/drawn.rs", "crates/blocks-desktop/src/act.rs", "crates/blocks-desktop/src/fallback.rs", "crates/blocks-desktop/src/island.rs", "crates/blocks-desktop/src/draw.rs"]
mods = ["crate::cx", "crate::drawn", "crate::act", "crate::fallback", "crate::island", "crate::draw"]
may_use = ["desktop-look", "tree"]

[[layer]]
name = "desktop-draw"
paths = ["crates/blocks-desktop/src/draw/**"]
mods = []
may_use = ["desktop-look", "desktop-cx"]

[[layer]]
name = "desktop-stage"
paths = ["crates/blocks-desktop/src/stage.rs", "crates/blocks-desktop/src/lib.rs"]
mods = ["crate::stage", "blocks_desktop"]
may_use = ["desktop-look", "desktop-cx", "expr", "behave", "tree"]

[[layer]]
name = "desk"
paths = ["crates/blocks-desk/src/**"]
mods = ["blocks_desk"]
may_use = ["desktop-stage", "expr", "tree"]

[[ban]]
pattern = "egui"
paths = ["crates/blocks/Cargo.toml", "crates/blocks/src/**", "site/Cargo.toml", "site/src/**"]
reason = "the blocks crate links no toolkit: egui is the desktop renderer's alone"

[[ban]]
pattern = "eframe"
paths = ["Cargo.toml", "crates/*/Cargo.toml", "crates/*/src/**"]
reason = "the window is the app's: the desktop renderer draws into the Ui it is handed"

[[ban]]
pattern = "winit"
paths = ["Cargo.toml", "crates/*/Cargo.toml", "crates/*/src/**"]
reason = "the window is the app's: the desktop renderer draws into the Ui it is handed"

[[ban]]
pattern = "wgpu"
paths = ["Cargo.toml", "crates/*/Cargo.toml", "crates/*/src/**"]
reason = "the harness draws on the CPU: no GPU crate here"
```

Two existing bans each gain one exception, for the harness's two impure files:

```toml
# pattern = "std::fs"
except = ["crates/blocks/src/codegen.rs", "crates/blocks-desk/src/main.rs"]
# pattern = "Instant::now"
except = ["crates/blocks-desk/src/stopwatch.rs"]
```

The desktop crates take no module name that a blocks layer already claims (`kind`, `tree`, `theme`, `layout`,
`web` and the rest): arch-check matches `mods` as text, in every crate. Nothing goes under `frozen`, `generated`
or `[[collect]]`.
