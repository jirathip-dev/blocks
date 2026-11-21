# message: a chat message in every renderer, and text that streams (#296)

## Summary

Decision: a message says who is speaking, around ordinary blocks: its text is a prose block, each tool call a
small block of its own, its attachments a list on the message. Text streams by one new op that adds to the end
of a prose block; the server's diff writes it, so an app only puts the longer screen. An 8,000-character reply
sends 0.15 MB in place of 4.2 MB and draws a frame in 0.05 ms in place of 0.6 ms.
Slices: five, about 1,300 lines: the op; a markdown reader; both kinds in HTML, React and the static page; SwiftUI; egui.
Open questions: (1) one cap raise for them (292 lines left)? (2) the op and the reader as two issues ahead of this one?

## Read in this order

| File | What |
|---|---|
| `usage.md` | how the callers read: a thread screen, a reply that streams, a client, a TS app, the test |
| `adr.md` | the question, what exists, the options with their measured cost, the decision in ten parts, consequences, the guard rules, hot files, the `.drover/arch.toml` lines |
| `shapes.md` | the two kinds, the attachment, the op and its three rules, what `diff` writes, the JSON, hooks and roles, fixtures |
| `boundaries.md` | which module may call which, what every renderer does, three statecharts |
| `measured.md` | the wire, the crate and WebKit, measured on a long reply; what was not measured |

## The kind at a glance

| The issue asks for | It is | Changes by |
|---|---|---|
| who sent it: owner, agent or system, a name, an avatar | `message`: `role`, `name`, `avatar` | `merge` on the message |
| text set as prose | a `prose` block in the message's `blocks`, its parts read from markdown by `Prose::read` | the new `append` |
| a sign that it is still streaming | `streaming` on that prose block | `merge` on the prose |
| tool rows: name, summary, state, folded body | a `tool` block each, in the same `blocks`, in the order things happened | `insert`, then `merge` on the tool |
| attachments: files and images, a name and an open action | `files` on the message: `name`, `tap`, and `src` for an image | set with the message |

## The slices, in order

Counted lines are non-test, non-generated lines under `ci/cap.toml`: 41,208 of 41,500 today (`drover cap blocks`).

| | Slice | Builds | Needs the design | Counted | After |
|---|---|---|---|---|---|
| M0 | this PR | this folder | | 0 | |
| M1 | the op | `append` in `wire`, `patch`, `diff` and `wire::old`; `apply` in TS (moved to the core) and Swift; prose grown in place by the HTML patcher; `fixtures/append/`; `docs/schema/stream.md`; the `arch.toml` ban | no | +190 | M0 |
| M2 | the reader | `Prose::read` and `fixtures/read/` | no | +170 | M0 |
| M3 | the kinds | `message`, `tool`, `Attachment` and `prose`'s `streaming` in the crate; the static page, HTML and React views; the guard rules; fixtures and stress rows; the showcase page, which plays a recorded reply; `docs/schema/blocks.md` | yes | +570 | M1, M2 |
| M4 | SwiftUI | `Kind/Message.swift`, `Kind/Tool.swift`, the sign in the prose view | yes | +170 | M3 |
| M5 | egui | a native `prose` view, `message`, `tool` | yes | +220 | M3 |

M1 and M2 are useful alone: after M1 any prose block streams. M4 and M5 can run side by side.

## What the design stage draws

At 1440 and 390, light and dark, on the default look:

- a message by each role, with an avatar and without; two in a row by the same speaker; a long name
- a reply in order: text, a tool row in each state (running, done, failed), folded and open, then more text
- the streaming sign: after a paragraph, inside a code block, and on a text with nothing in it yet
- attachments: one image, one file, several of both, a long file name
- a message that holds another block (a `diff`, an ask `card`)

## Open questions

1. **The cap.** 292 lines are left and the five slices need about 1,320. One raise sized by `drover cap blocks`
   when M1 starts, with margin (recommended), or say which slice waits.
2. **Two issues ahead of this one.** M1 and M2 have no look, so they can be built and reviewed while the design
   is drawn, and #296 then holds M3 to M5 with its AC as written (recommended). Or all five in #296's one PR.

## Where each ask of the issue is answered

| The issue asks | Where |
|---|---|
| the kind's data shape and its builder | `shapes.md`, The two kinds; `usage.md` part 1 |
| how streaming text reaches a renderer, with its cost measured | `adr.md` option 3 and decisions 5 to 8; `measured.md`; `boundaries.md`, What every renderer does |
| tool rows and attachments: fields or child blocks | `adr.md` option 1 and decisions 1 to 3 |
| the guard rules | `adr.md`, Guard rules |
| AC 3, in place with no redraw of the whole screen | `boundaries.md` point 5; `usage.md` part 5 |

## What was read

- blocks `staging` at `03a0d70`: `kind/` (macros, `prose`, `text`, `composer`, `card`, `parts`), `wire.rs`,
  `patch.rs`, `diff.rs`, `shelf.rs`, `mirror.rs`, `built.rs`, `tree.rs`, the guard's rules, `site/md.rs` and
  `site/kind/prose.rs`; `web/src/patch.ts`, `stream.ts`, `render/` (`block.ts`, `prose.ts`, `text.ts`,
  `composer.ts`, `images.ts`), `web/react/src/view.ts` and `block.ts`; `Apply.swift`, `BlocksView.swift`, the Swift
  prose view; `blocks-desktop`'s `stage.rs` and `draw.rs`; `docs/schema/`, `.drover/arch.toml`, `scripts/compat.sh`.
- `docs/architecture/blocks/renderers.md` (the renderer contract) and the hotspots ADR.

The wire, the crate and the HTML drawing were measured (`measured.md`). The line counts are estimates from the
size of `prose`, `composer` and `steps` in each renderer.
