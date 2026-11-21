# Measured

Nothing here is in the repo: a scratch test in `crates/blocks/tests/` and a scratch page were run and deleted.
Staging `03a0d70`, a release build, macOS; Playwright 1.63.0's WebKit.

## The setup

- A thread screen: one `section` of 40 earlier replies, each a `prose` block of about 2,000 characters, and the
  reply being written as the last `prose` block. 170 KB as JSON before the reply starts.
- A reply: markdown with headings, paragraphs, lists, and bold or inline code about every sixth word, read into prose
  parts by a scratch reader of 90 lines. Cases B and D also hold one fenced code block.
- A frame for every 16 characters of markdown: a model writing 60 tokens a second, sent 15 times a second.
- **merge** is today's code, run for real: the app puts the screen, `Shelf::put` diffs it, the diff writes a
  `merge` of the block's whole `parts`, `Mirror::frame` applies it.
- **tail only** and **text, else tail** are the two forms of the new op. The op is not written yet, so each frame's
  bytes are those of the JSON it would be, counted exactly.

## 1. On the wire

| Reply | Way | Frames | Bytes in all | Largest frame | Of the ring's 16 frames, kept |
|---|---|---|---|---|---|
| A: 8,000 characters | merge | 500 | 4,226,858 | 16,737 | 3 |
| | tail only | 500 | 227,725 | 861 | 16 |
| | text, else tail | 500 | 151,501 | 861 | 16 |
| B: 8,657, with 4,000 of code | merge | 541 | 4,087,368 | 13,819 | 4 |
| | tail only | 541 | 690,019 | 4,260 | 16 |
| | text, else tail | 541 | 113,528 | 861 | 16 |
| C: 32,000 characters | merge | 2,000 | 66,673,772 | 66,480 | 0 |
| | tail only | 2,000 | 911,685 | 861 | 16 |
| | text, else tail | 2,000 | 604,552 | 861 | 16 |
| D: 20,347, with 12,000 of code | merge | 1,272 | 21,325,356 | 29,624 | 2 |
| | tail only | 1,272 | 4,954,008 | 12,388 | 5 |
| | text, else tail | 1,272 | 236,029 | 861 | 16 |

- `merge` sends 4 MB for an 8,000-character reply and 67 MB for a 32,000-character one: every frame carries the
  whole text so far. It also fills the shelf's ring (64 KB) with 0 to 4 frames, a quarter of a second at most, so
  a client that reconnects during a reply gets the whole screen.
- `tail only` (the parts from the first changed one on) is enough for prose, but a long code block is one part: in
  D it still sends 5 MB, and the ring keeps 5 frames.
- `text, else tail` stays between 12 and 19 times the reply's own size in every case. Most of that is the frame's
  envelope (about 95 bytes around 16 characters). In A, 226 frames were `text` and 274 were a tail.
- With a frame per 64 characters (case C, 500 frames): merge 16.7 MB, either form of the op 0.28 MB.

## 2. The crate, per frame

| | A (screen 170 to 186 KB) | C (170 to 236 KB) | the reply alone on its screen |
|---|---|---|---|
| read the markdown so far | 12 to 15 µs | 47 to 55 µs | 9 to 13 µs |
| build the screen | 0.42 to 0.51 ms | 0.45 to 0.51 ms | 3 µs |
| `Shelf::put` (serialize, parse the old JSON, diff, write the frame) | 2.2 to 2.5 ms | 3.5 to 3.7 ms | 0.31 to 0.42 ms |
| `Mirror::frame` with the merge | 0.24 to 0.29 ms | 0.65 to 0.72 ms | 0.10 to 0.14 ms |
| the mirror's copy of the screen alone | 0.10 to 0.13 ms | 0.10 to 0.13 ms | 6 to 8 µs |

- The server's cost is `Shelf::put`, and it grows with the screen, not with the op: about 2.5 ms a frame on a
  40-message thread. At 20 frames a second that is 5% of one core for each reply being written. The new op does not
  change it, so the lever is the app's: batch the model's text, and page a long thread.
- A client's cost with `merge` is the screen's copy plus a round trip of the prose block through JSON. With
  `append` the round trip goes, and the copy (0.1 ms) is what is left.

## 3. Drawing, in WebKit

A page with the 40 earlier replies drawn by a copy of `render/kind/prose.ts`, styled by `dist/blocks.css`, at 390
and 1440 wide. Each frame was applied and laid out (a forced layout after every frame; paint is not in it).

- **redraw**: what the patcher does for a `merge` today: draw the block again and replace its element.
- **in place**: `text` goes on the last text node; a tail removes the part elements from `keep` on and adds the new.

| Reply | Way | Per frame | Longest frame |
|---|---|---|---|
| A | redraw | 0.53 to 0.61 ms | 2 ms |
| | in place | 0.04 to 0.05 ms | 1 ms |
| B | redraw | 0.44 to 0.47 ms | 2 ms |
| | in place | 0.05 ms | 1 ms |
| C | redraw | 2.1 to 2.5 ms | 12 to 19 ms |
| | in place | 0.05 to 0.06 ms | 1 ms |
| D | redraw | 0.89 to 0.96 ms | 7 to 9 ms |
| | in place | 0.09 to 0.10 ms | 1 ms |

- After every run the element grown in place was equal (`isEqualNode`) to a fresh draw of the final parts.
- Redraw is over the 4 ms patch gate on the long replies, and it makes a new element each frame: a selection in
  the reply, and the scroll of a wide code block, are lost 15 times a second. In place keeps both.
- WebKit's clock has 1 ms steps, so the longest frame is in whole milliseconds; one in-place run showed a single
  5 ms frame. The per-frame figures are a run's total over its frames.
- The copy of the whole screen that `apply` makes for every batch (`structuredClone`) took 1.3 to 1.9 ms on these
  screens: more than the drawing, the same for every op, and not changed here.

## Not measured

- SwiftUI and egui: neither was run. Both draw from the changed value, so the wire and model figures apply; their
  drawing cost is first seen in the harness script of `usage.md` part 5.
- `Shelf::put` with the new op: `diff` is not written. It should be a little under the merge figure, since the
  frame it writes is small.
- The share of `text` frames depends on the reader. The scratch one sets the open part again whenever a mark
  opens or closes; a reader that waits for a mark to close would send fewer tails.
