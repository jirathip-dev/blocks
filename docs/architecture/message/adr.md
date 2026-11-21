# ADR: a message kind and text that streams (#296)

## Summary

Decision: a message says who is speaking, around ordinary blocks: its text is a prose block, each tool call a
small block of its own, its attachments a list on the message. Text streams by one new op that adds to the end
of a prose block; the server's diff writes it, so an app only puts the longer screen. An 8,000-character reply
sends 0.15 MB in place of 4.2 MB and draws a frame in 0.05 ms in place of 0.6 ms.
Slices: five, about 1,300 lines: the op; a markdown reader; both kinds in HTML, React and the static page; SwiftUI; egui.
Open questions: (1) one cap raise for them (292 lines left)? (2) the op and the reader as two issues ahead of this one?

## Question

How is a chat message a blocks kind that five renderers draw, and how does a reply that is still being written
reach them without sending again, or drawing again, what is already there?

## What exists, read from the code

- `prose` is text as a typed tree (`Part`, `Span`). HTML, React, SwiftUI and the static page draw it; egui draws
  its fallback (`draw/prose.rs` is a `TODO(#45)`). `text` holds a markdown string that each renderer reads with its
  own small `md()` (Rust, TS and Swift copies), which knows code, bold and links but no headings or lists.
  `lint/text-wall` already sends a builder from `text` to `prose` over 600 characters.
- An op names a block by its id. `merge` sets whole fields: `patch.rs` turns the block into JSON, lays the fields
  over it and parses it back. `diff` writes a `merge` for a changed field, so a text that grew is sent whole.
- `Shelf::put` takes a whole screen: it serializes it, parses the old one and diffs. Its ring keeps the last 16
  frames or 64 KB.
- The HTML patcher redraws a block on any `merge` (an island's `props` excepted) and applies every batch to a
  copy of the whole screen. A fold's open state is kept by block id (`Ctx.open`), so it survives a redraw. React
  draws again by `share` and a memo per block; SwiftUI and egui draw from the value they hold.
- A block in a list that ops reach gets `insert`, `merge`, `remove` and the diff by id from the code that exists;
  `Built`, the guard and the tree already walk any `blocks` list. A child that is no block (`Lane`, `Round`,
  `TableRow`) needs its own arm in `wire::Child`, which is untagged: an `{id, name, state}` child reads as a `Round`.
- `Built::check` refuses two objects of one block that send the same action.
- A client that meets an op it does not know drops the frame and asks for the whole screen
  (`docs/schema/versioning.md`). Release `v2.0` exists, so the compat job runs it on today's `fixtures/protocol/`.
- `web/src/patch.ts` is at its 200-line limit. The cap has 292 lines left (`drover cap blocks`).

## Options

### 1. Where the text, the tool rows and the attachments live

| | A. Fields of `message` | B. Typed children with ids, as a table's rows | C. Child blocks |
|---|---|---|---|
| Shape | `parts`, `tools`, `files` | the same, each tool reached by `insert` and `merge` | `blocks`: a `prose` for text, a new core kind `tool` |
| Text between two tool calls | no: the text, then the tools | no | yes, in the order it was said |
| One tool changes state | a `merge` of the whole `tools` list, bodies included; HTML redraws the whole message | one small `merge`; a new arm in the untagged `Child`; three patchers learn a second kind of list | one small `merge` by the code that exists; only that block is drawn again |
| Each row's hooks, role and name | by hand, in five views | by hand, in five views | the block switch gives them, as to any block |
| New kinds | 1 | 1 | 2 |
| What can be built wrong | nothing | nothing | any block may sit in a message, as in a card |

### 2. What the text is

| | Markdown, read by each renderer | Prose parts, read once on the server |
|---|---|---|
| Readers | four (TS, Swift, the static page, egui), each taught headings and lists, held together by fixtures | one, in the crate |
| Drawing | new in each renderer | the prose views that exist; egui's is written here either way |
| What streams | characters added to a string | parts and text added to the end of a tree |

### 3. How a growing text reaches a renderer

Measured on a 170 KB thread screen, a frame per 16 characters (`measured.md`):

| | `merge`, as today | A new op, tail only | A new op: text, else tail |
|---|---|---|---|
| A frame carries | every part so far | the parts from the first changed one on | the added characters; the changed parts only when the shape changed |
| An 8,000-character reply | 4.2 MB | 0.23 MB | 0.15 MB |
| A 20,000-character reply with a 12,000-character code block | 21.3 MB | 5.0 MB | 0.24 MB |
| The largest frame | the whole text | the open part: 12 KB in a code block | under 1 KB |
| Frames left in the shelf's ring for a reconnect | 0 to 4 | 5 to 16 | 16 |
| HTML, per frame | 0.5 to 2.5 ms, up to 19 ms; a new element each time | not run alone: the open part is made again each frame | 0.05 to 0.1 ms; the same elements |
| A client built before it | draws it | asks for the whole screen on every frame | the same |

A fourth way, one child with an id per chunk of text and an `insert` for each, needs no new op, but it leaves
the screen a list of thousands of chunks, each with an id, for good.

## Decision

1. **A message is who is speaking, around blocks (C).** `message` has `role` (`agent`, `owner`, `system`), `name`,
   an optional `avatar`, `blocks` and `files`. Its blocks are ordinary blocks in the order they were said, and
   ops reach them as they reach a card's. Text between two tool calls, and a `diff` or an ask `card` inside a
   reply, need nothing more.
2. **A tool call is a core kind, `tool`**: `name`, `state` (`running`, `done`, `failed`), a one-line `summary`
   and an optional `body` of plain text, folded until opened. Being a block gives it an id, small ops and a
   redraw of its own. It may also stand outside a message.
3. **Attachments are a field**, `files`: each a `name`, a `tap` that opens it and, for an image, a small `src`.
   They are set once with the message and never change alone, so they need no ids and no ops. The rule: what
   changes by itself is a block; what is set once is a field.
4. **The text is prose, read once.** A message's text is a `prose` child. `Prose::read(markdown)` in the crate
   turns markdown into parts; no renderer reads markdown for a message. `shapes.md` lists what it knows.
5. **One new op, `append`, grows a prose block at its end.** It keeps the first `keep` parts, adds `parts`, then
   adds `text` to the last part's text (`shapes.md` has the three rules). It counts parts, never characters. One
   that does not fit is a gap, answered by the whole screen, as for any op.
6. **Only `diff` writes it.** For a prose block whose parts changed, `diff` writes an `append` in place of a
   `merge` of `parts`: `text` when only the last text grew, else `keep` and the parts after it. An app's code does
   not change: it builds the next screen and puts it. `Shelf`, `Mirror` and `Replica` keep their signatures.
7. **`prose` gains `streaming`.** While it is set, every renderer draws a sign after the last part and marks the
   block busy. The flag is on the block that grows, so any prose can stream and a message needs no flag of its own.
8. **Every renderer grows the text in place** (`boundaries.md` has each one's way and its test). In HTML the
   patcher hands an `append` to the prose view; a `merge` on a tool redraws that tool alone.
9. **The old stream and older clients.** `wire::old` turns an `append` into a `merge` of the block's `parts`.
   The wire version stays 2: a new op is an additive change.
10. **`apply` moves out of `web/src/patch.ts`** into `web/src/core/apply.ts`, with its callers. The patcher is at
    its line limit, and the model half is pure: it belongs in the core, where a React app can also call it.

## Consequences

- An app streams a reply with the calls it already makes. It must give an id to every message, tool and prose
  that changes; without one `diff` falls back to replacing the parent (`lint/stream-no-id`).
- A client built before `append` asks for the whole screen on every frame of a reply. It ends on the right
  screen, slowly. An app ships its clients first, then lets its server stream. The cases live in
  `fixtures/append/`, not `fixtures/protocol/`, so the compat job's last release is not asked to know the op.
- Any prose block that changes is now sent as an `append`, streaming or not. For the apps of today that is
  smaller or equal; for a client built before the op it is the whole screen once.
- The server's cost per frame stays what `Shelf::put` costs: about 2.5 ms on a 40-message thread. Apps batch the
  model's text (20 puts a second is 5% of a core) and page long threads. A cheaper `put` is not this issue.
- Each client still copies the whole screen for every batch of ops (1.3 to 1.9 ms in TS on these screens). With
  drawing in place this is the largest cost left per frame. It is not changed here.
- Two attachments of one message cannot send the same action: `Built::check` refuses it today. They open by
  `url`, `open` or `sheet`, or each sends its own action.
- Two kinds are added, not one, and each brings its sample, fixtures and stress rows. `blocks new kind` writes
  the five files of each.
- egui gains a native `prose` view, since a message of fallback rows would not meet AC 2. An image attachment
  has no thumbnail in egui (no decoder, as for `images`): it is a named control.
- Markdown that `read` does not know (a table, a nested list's indent) is shown as text. `text` and its three
  `md()` copies are untouched.

## Guard rules

| Rule | New or widened | Finds | Fix text |
|---|---|---|---|
| `lint/stream-no-id` | new, error | a `message`, a `tool`, or a `prose` with `streaming`, that has no `id` | Give it an `id`: ops reach a block by its id, and without one each change replaces its parent. |
| `lint/summary-long` | new, warn | a tool's `summary` over 80 characters | Keep one line that says what it did; put the output in `body`. |
| `lint/tap-empty` | new, error | an attachment whose `tap` opens nothing | Give its `tap` a `url`, an `open`, a `sheet` or an `action`. |
| `lint/label-long` | widened | a message's or a tool's `name` over 30 characters | as today |
| `lint/label-empty` | widened | a blank `name` of a message, a tool or an attachment | as today |
| `lint/empty-state` | widened | a message with no blocks and no files | as today |
| `render/tap-target`, `render/no-name` | as they are | an attachment's control or a tool's head under 44 px, or with no name | as today |
| `render/overflow`, `render/clipped-text` | as they are | a long file name, tool name or code line that leaves 390 px or is cut | as today |
| `render/frame-budget` | as it is | the streaming script's frames | as today |

An attachment's `name` has no length rule: it is the user's file name. The design says how a long one is cut,
and the stress fixture holds one. Each new rule gets its failing screen in `fixtures/guard/bad/lint/`, as the
rule table test asks; each widened rule gets a test of its new case.

## Hot files

- **Central lists.** The lists of kinds are generated already (`kind/core/mod.rs`, `site/kind/drawn.rs`,
  `Gen/Kinds.swift`, the TS and React tables): each kind is new files and `just gen`. Two hand-kept tables take
  two lines each and are on no hotspot list: `tree.rs` (`VARIANTS`, `ROLES`) and `blocks-desktop/src/draw.rs`.
- **`web/src/patch.ts`** is `shared` under a 200-line limit and full. Decision 10 splits it by what it is: the
  model's `apply` to `web/src/core/apply.ts`, the DOM patcher stays. The new op's rule is in the kind's own
  files (`core/kind/prose.ts`, `render/kind/prose.ts`), so the patcher gains about four lines. The ban below
  keeps the model out of it.
- **Generated files** are regenerated by `just gen`, never merged by hand: the schema, the TS and Swift types and
  builders, the fixtures under `fixtures/blocks/`, `trees/`, `html/`, `site/`, `stress/` and `skill/`.
- **Docs** are already one file per area: the op goes in `docs/schema/stream.md`, the kinds in
  `docs/schema/blocks.md`.

## The `.drover/arch.toml` lines

The slice that adds the op adds, in the same PR that moves `apply`:

```toml
[[ban]]
pattern = "structuredClone"
paths = ["web/src/patch.ts"]
reason = "the patcher draws; the model's copy and its ops are core/apply.ts"
```

No other line changes: the new files fall under the layers, collected folders, size limits and `generated`
patterns that exist (`fixtures/append/` and `fixtures/read/` are kept by hand, like `fixtures/behave/`).
