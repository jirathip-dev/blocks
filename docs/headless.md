# Headless: frame timing, batching and motion

The harness contract is `docs/architecture/blocks/renderers.md` section 6; this page names its frame budget (q2112).

## `report.json` timings

| field | `blocks-shot` (WebKit) | `blocks-snap` (SwiftUI) |
|---|---|---|
| `first_paint_ms` | the first paint | the first render |
| `steps_ms` | each step's time | each step's main-thread time |
| `longest_frame_ms` | the longest frame metered during `scroll` steps and `frame` bursts | absent: no real frames |
| `frames_over_budget` | the frames over 16.7 ms there | absent |
| `longest_patch_ms` | the longest patcher pass in one frame | absent |

A frame's time is its main-thread work: the tasks since the last frame, its animation-frame callbacks, style, layout
and paint. A `scroll` step scrolls smoothly to the block; consecutive `frame` steps play as a burst, 60 a second.
The frame fields are optional, so a report from an older harness still reads.

The gate (`web/test/shot.test.ts`): on the 200-row screen, a scripted scroll and a 2 s burst of 60 frames a second
keep every frame in 16.7 ms and each frame's patch in 4 ms.

## Batching

Every op that arrives within one animation frame is applied in one pass before the next paint, so a burst costs one
layout. `stream.ts` hands a key's frames to the view once per animation frame with all their ops; the patcher draws
the ops queued within a frame in one pass; the Swift `Replica.frames` takes a burst in one mutation.

## Motion

`blocks.css` animates `transform` and `opacity` only, with durations scaled by `--motion` (the style's `motion`
token), and stops all motion under `prefers-reduced-motion`. `web/lint.mjs` refuses a transition or keyframe of any
other property (`web/lint-fixtures/motion.css` is its failing fixture). SwiftUI scales its animation durations by
`look.style.motion`.
