# ADR: GPUI or egui for cooee's desktop app (#299)

## Summary

Decision: egui stays. GPUI's text is the OS's own and its frames are as steady, but an app cannot pin a release of
it, it has no text field and no selectable text, `deny.toml` refuses its tree, its right-to-left is wrong on Windows,
and its harness needs a GPU driver or a real window on every runner. Not worth rewriting the renderer for.
Slices: one: land this folder and make the spike's workflow manual. No renderer change.
Open questions: keep the prototype or delete it; a follow-up issue for `blocks-desktop`'s look; whether cooee
needs right-to-left text on the desktop.

## Question

Cooee's desktop app owns its whole window on Linux and Windows and draws its screens through blocks. The desktop
ADR chose egui over iced and Slint but never measured GPUI, Zed's toolkit. Does GPUI look or run enough better than
egui, for an app that owns its window, to be the toolkit instead; and if so, what becomes of `blocks-desktop`?

## What was measured

A GPUI prototype (`proto/gpui`, 1,100 lines) draws `screen`, `list`, `row`, `card`, `text`, `prose` and `composer`
from the crate's samples and applies ops with `blocks::apply`, next to `blocks-desktop` unchanged in an eframe
window (`proto/egui`). `measured.md` has each command and every number; `look/` has the pictures.

| | egui 0.37.0 | GPUI, `zed` at `2f808b3c` |
|---|---|---|
| 1. Look | its own text raster, the same on every OS; bundled font unless the app sets one | the OS's text (CoreText, DirectWrite, cosmic-text) in the OS's font; flexbox layout; shadows as a primitive |
| 2. A frame of the 200-row screen, CPU only | 0.26 to 0.44 ms | 1.4 to 2.8 ms |
| 2. Real window, 100 Hz display, scroll and stream | every frame on time, of 480 | every frame on time, of 480 |
| 3. Crates for a window app, Linux / Windows / macOS | 280 / 179 / 178 | 441 / 263 / 303 |
| 3. `deny.toml` on the window app | 6 licences refused; sources pass | 14 licences refused, MPL-2.0 among them; 34 crates from 5 git sources refused |
| 3. `deny.toml` on the toolkit alone (what a renderer crate links) | **passes**: 54 crates | fails: 249 crates, 6 licences, 12 from git |
| 4. Smallest window app, macOS arm64, stripped | 10.1 MB | 6.0 MB |
| 4. The same, Linux x86_64 / Windows x86_64 | 18.5 MB / 13.7 MB | 23.5 MB / 8.9 MB |
| 5. Pixels in CI with no GPU | on the CPU, no window, the same bytes on four machines | macOS: Metal. Linux: a software Vulkan driver. Windows: no headless renderer |
| 6. Builds and runs in a real window, on GitHub's runners | Linux X11 and Wayland, Windows, macOS | the same four, each on a software renderer |
| 6. Releases | crates.io, a version an app pins | crates.io is 13 months and 668 commits behind; today's source cannot be published; an app pins a git commit |
| 7. Right-to-left | **wrong**: words in the wrong order | right on macOS and Linux; **wrong on Windows**: every letter in the wrong order |
| 7. Thai | shaped; lines break inside words | the same |
| 7. Text field with IME | built in | none: the app writes one (195 lines here, with no selection, caret keys or clipboard) |
| 7. Select and copy shown text | built in | none |
| 7. AccessKit | built in | in this snapshot only; none in the crates.io release |

## Options

| | Option | Verdict |
|---|---|---|
| A | **egui, as today** | **chosen** |
| B | GPUI from Zed's repository, pinned to a commit | no: see below |
| C | GPUI 0.2.2 from crates.io | no: 13 months old, no accessibility at all, `tokio` and `hyper` in its tree, 26 licences refused |
| D | GPUI through a third party's crates.io copy (`gpui-pre`, with `gpui-component` for the missing controls) | not measured, and not now: one publisher re-releasing another project's code every week is a weaker pin than a commit |
| E | Both: egui now, a GPUI renderer beside it | no: two desktop renderers to hold to `renderers.md` section 7 for one app |

What `blocks-desktop` would have become under B is the last section of `design.md`. Why B loses, in the order
that decided it:

1. **There is nothing to pin.** GPUI's last release is of October 2025. Everything that makes it a candidate
   (AccessKit, wgpu on Linux, the headless renderers) exists only in Zed's repository, where it moves with Zed: 154
   commits in the last three months. `gpui` is the only crate of its tree marked for publishing.
2. **It is half a toolkit for this app.** The kinds the issue names say what the app needs: a composer, and prose
   people copy. GPUI has the plumbing for both and neither control. Zed's own text field and editor are in
   GPL-licensed crates.
3. **`blocks-desktop` could not stay in this workspace.** `egui` alone passes `deny.toml`; `gpui` alone fails on
   sources and licences, so the renderer would move out of the workspace's lock, lints and cap, or `deny.toml` would
   allow git sources and MPL-2.0.
4. **The harness loses its CPU path.** `blocks-desk` draws the same bytes on three OSes with no GPU and no window.
   GPUI's pixels come from a GPU API on each OS: a software Vulkan driver installed on the Linux runner, nothing at
   all headless on Windows, and different bytes on every machine.
5. **What it wins is small here.** Frame time does not decide: both are far inside a frame. The look in `look/`
   is mostly `blocks-desktop` being unfinished: with the app's font, sizes and spacing set, egui is close
   (`look/egui-look-390-light-styled.png`). What remains is native text, which matters, and right-to-left, which
   GPUI gets wrong on Windows, one of the app's two platforms.

## Decision

1. **egui 0.37 stays the desktop toolkit.** Cooee's desktop app is an eframe app around `blocks-desktop`, as
   `docs/architecture/desktop/usage.md` reads. It can start now.
2. **`blocks-desktop` and `blocks-desk` do not change for this issue.** #296 and #297 go on unchanged.
3. **The look is closed in `blocks-desktop`, not by a toolkit:** a type scale and spacing from the style tokens,
   the app's font, native `prose` and `composer`. That is a follow-up issue (open question 2), not this one.
4. **The prototype stays** in `docs/architecture/gpui/proto/`, outside every workspace, as the way to take these
   numbers again: `bash docs/architecture/gpui/proto/measure.sh <step>`. Nothing may import it.
5. **`.github/workflows/gpui-spike.yml` becomes manual** (`workflow_dispatch` only) in the slice that lands this.
6. **Look again when both hold:** GPUI has a crates.io release that carries its platform crates and AccessKit; and
   cooee needs something egui cannot give by then (right-to-left text is the likely one).

## Consequences

- **Right-to-left text stays wrong on the desktop** until egui reorders lines. `docs/desktop.md` already says so;
  `measure.sh probe` is now the test that will show the day it is fixed.
- **Desktop text is egui's, not the OS's.** It is the same on Linux, Windows and macOS, which is also why the
  harness's PNGs are the same bytes on all three (measured here: identical files from this Mac and three runners).
- **Thai lines break inside words** on the desktop. GPUI would not have fixed it.
- **An egui release stays a breaking change** for desktop apps, as the desktop ADR recorded. GPUI's answer to the
  same problem is worse: no releases.
- **About 1,700 lines of Rust sit outside the line cap, clippy and `cargo deny`,** under `docs/`. They are
  formatted and comment-free, and `arch-check` passes. Open question 1.
- **`blocks-desktop` on macOS needs no Xcode component.** GPUI does: its build compiles Metal shaders, which needs
  the Metal toolchain, or a feature that compiles them at every start. This host could only build it the second way.

## Open questions

1. **The prototype after this decision.** Keep it as measuring equipment (recommended; AC 3 asks for it in the
   repo), or delete `proto/` and the workflow once the ADR is approved and keep only the numbers and pictures.
2. **A follow-up issue: `blocks-desktop`'s look.** The pictures make the case better than the numbers: slice 1's
   spacing and type sizes are what makes the egui side look unfinished. Recommended: file it, after #296.
3. **Right-to-left on the desktop.** If cooee needs Arabic or Hebrew there soon, say so. egui gets it wrong
   everywhere and GPUI gets it right on Linux and macOS only, so neither is an answer for Windows today; it would
   become an issue of its own rather than a reason to switch.

## Hot files

This ADR converts no hot file and adds no central list, generated file or shared doc. It adds one CI file of its
own area (`gpui-spike.yml`) and one docs folder. The `.drover/arch.toml` lines the impl lane adds: **none**.
