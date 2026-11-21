# ADR: Thai lines break between words in `blocks-desktop` (#306)

## Summary

Decision: egui keeps doing the wrapping. `blocks-desktop` finds the word boundaries in Thai text with the ICU4X
segmenter's bundled dictionary, puts an invisible zero-width space egui may break at on each one, and takes them out
again once egui has laid the text, so copied text and screen readers get the text as written. Text with no Thai takes
egui's path untouched. A prototype draws it right.
Slices: one PR, about 230 lines: a baseline snapshot; the module and the probe test; every label through it, snapshots.
Open questions: the segmenter as a new dependency: 1.1 MB more in a release binary (the ADR has three smaller ways).

## Question

egui 0.37 breaks a Thai line wherever it runs out of room, because Thai has no spaces and egui only knows spaces.
Where do the word boundaries come from, how do they reach egui's wrapping, and what do they cost in dependencies and
binary size?

## What was found

Read in `epaint` 0.37.0 and `icu_segmenter` 2.4.0, and measured with the prototype in `proto/` (`measured.md` has
every command and number).

1. **egui's line breaker has no hook.** It breaks after whitespace, around CJK, after `-` or ASCII punctuation, and
   otherwise after any glyph. The Unicode character made for this, U+200B, is drawn with no width but is not a place
   to break. `\r`, which egui's source calls invisible, is a place to break but is drawn as wide as a space.
2. **A space in a section of its own, at font size 0.000001, is a place to break with no width.** With one after each
   word, the line not wrapped has the same glyph places, size and vertex count as egui's own, and the same PNG bytes.
3. **egui will lay a label out and not paint it.** `Label::layout_in_ui` is public: egui wraps and places the label,
   in a column or along a wrapping row, and hands back the galley. So the flow prose, a row and a card's head rely on
   (a label goes on after the one before it, then down a line) is kept. A galley made beforehand loses it.
4. **A laid galley can be edited.** Its rows' glyph lists are public. With the gap glyphs dropped and the caller's
   text put back, egui's selection, copy, AccessKit and text field code read it as one of its own.
5. **The dictionary is quick; the LSTM model is not.** Breaks for a row title take about 1 µs and for a
   165-character paragraph 4 to 6 µs with the dictionary, 57 to 97 µs and about 0.5 ms with the LSTM, which also
   splits `มาก`.
6. **ICU4X bundles four dictionaries as one.** Thai is 132 KB of 1,036 KB; Burmese, Khmer and Lao are the rest.
7. **ICU4X's dictionary matcher allows a break before `ๆ`, and before a letter that carries `์`** in a name it does
   not know (`จิร|ทีป|ต์`). ICU4C keeps `ๆ` and `ฯ` with the word before them; ICU4X's matcher has no such rule, so
   one rule here covers those and the `์` case.
8. **egui lists three glyphs for `คำ`, which is two characters** (the shaper splits `ำ`). So egui's own caret in a
   text field runs one ahead after each `ำ`, today, with or without this change. It also means a row cannot be matched
   to its text by counting glyphs, which shapes the design below.

## Options

Where the word boundaries come from:

| | Option | Adds to a release binary | Verdict |
|---|---|---|---|
| A | **`icu_segmenter` 2.4 with its bundled dictionaries** | 1.11 MB | **chosen** |
| B | The same crate with its LSTM model | 0.38 MB | no: 80 to 90 times slower, on every change of a streamed paragraph; wrong breaks in common words |
| C | The same crate with only Thai data, baked into this repo | about 0.2 MB (computed, not built) | not now: three more direct dependencies (`icu_provider`, `zerovec`, `zerotrie`), a generated data file with its generator, and ICU4X's unstable constructors. It is the way down if 1.1 MB is too much |
| D | A matcher and a word list written here | the list, 130 KB or more | no: ICU's handling of unknown words, digits and marks is rewritten smaller and worse; the list needs a licence and upkeep; its lines count to the cap |
| E | Each OS's own segmenter | 0 | no: three different answers, so snapshots differ per OS; none on wasm |
| F | `unicode-linebreak`, or `unicode-segmentation` (already in the lock) | small | no: without a dictionary there is no break inside Thai |

How they reach egui's wrapping:

| | Option | Verdict |
|---|---|---|
| G | **Zero-width gaps in the job egui lays, removed from the galley after** | **chosen**: egui's own breaker picks the rows, so Latin, spaces and Thai mix by one rule |
| H | Patch `epaint` | no: `deny.toml` refuses a git source, a copy in the tree is 8,900 lines to carry across egui releases, and upstream's schedule is not ours. Worth asking upstream to break at U+200B |
| I | Wrap here, hand egui newlines | no: two layouts for every text, and egui's breaker copied here for the Latin in a mixed line |
| J | U+200B or `\r` in the text | no: measured, neither works (fact 1) |
| K | A second text stack for Thai (cosmic-text, parley) | no: another rasteriser, so another look and other bytes |

## Decision

1. **`icu_segmenter` 2.4 is a new dependency of `blocks-desktop` only**, with default features off and
   `compiled_data` on. Unicode-3.0, which `deny.toml` already allows. It adds 23 packages to the lock (78 to 101), all
   pure Rust; `cargo deny --locked check` passes on the workspace with it added.
2. **One module, `words`, knows it.** `words::label`, `words::sensing` and `words::link` are a label that wraps,
   `words::lay` is a layout for a text field or an app's own kind, `words::breaks` is the boundaries. `usage.md` shows
   the callers.
3. **Text with no Thai is not touched.** The module hands egui the value the caller gave it; measured, egui returns
   the same galley. So is a label that does not wrap: one cut to a row with `…`, or one in a row that does not wrap.
4. **Thai in a label that wraps takes five steps** (`design.md` has the shapes):
   - *Cut*: ICU4X's line breaks from the dictionary, kept only where both neighbours are Thai, less those before a
     character that cannot start a word (a vowel sign or tone mark, `ๆ`, `ฯ`, a letter carrying `์`).
   - *Soften*: a copy of the job with a gap at each cut: U+0020 in a section of its own at size 0.000001.
   - *Lay*: egui shapes, wraps and places it, as for any label (`Label::layout_in_ui`) or job (`layout_job`).
   - *Harden*: the gap glyphs are dropped from the rows, and the galley gets the caller's text and sections back.
   - *Keep*: the cut and the hard galley are kept while egui still returns the galley they were made from.
5. **A word longer than its line breaks inside itself**, by egui's own last resort, as a Latin word does.
6. **A text field of one row does not wrap, so the form's and the choice's fields are untouched.** The composer has
   no native view on the desktop yet (`draw/composer.rs` is a `TODO(#45)` fallback, whose labels go through `words`
   like any other). `words::lay` is the layouter its field takes when it lands; it is tested now with a field of many
   rows, driven by real key events.
7. **With right-to-left (#304), `words` sits under `bidi`.** `bidi` stays the one door kinds use: where it hands plain
   text to `ui.label` it calls `words::label`, and where it lays its own job it softens and hardens around
   `layout_job`. If #304 has not landed, kinds call `words` directly and #304 moves the door when it does.
   `design.md` has both cases.
8. **Three things enforce it.** `arch.toml` bans `ui.label(` and `hyperlink_to(` outside the door, and
   `icu_segmenter` outside `words`. The probe test holds the issue's line to its eight words at 120 points. The Thai
   sample has every kind the issue lists, and a test holds it to that list, so the snapshots cover them.

## Limits

| Limit | Why |
|---|---|
| A word the dictionary does not know (a name, a new loanword) may break inside itself, never inside a syllable's marks | the dictionary cuts it into shorter known pieces; the LSTM keeps names whole but breaks common words |
| A button's or a chip's label, a field's hint and a tooltip that wrap still break as egui does | they are not labels; the issue lists the kinds that wrap text |
| A label cut to one row with `…` is cut where egui cuts it | no line is broken; egui edits the glyphs after wrapping |
| An underline or a strikethrough under Thai is drawn in pieces, a word each. It looks unbroken; a few pixels at the joins differ from egui's own | egui draws the line per section |
| Lao, Khmer and Burmese break as before | the issue is Thai. Their dictionaries are in the binary with option A, so each is one range in `words` and a sample |
| A caret after `ำ` in a text field is one character ahead | egui's bug (fact 8), the same without this change; not in this issue |

## Consequences

- **For apps:** Thai text wraps between words; nothing else changes. A release binary grows by 1.1 MB. An app's own
  kinds and islands draw with their own egui calls; they get the same by calling `blocks_desktop::words`.
- **Cost a pass:** with the cut and the hard galley kept, 200 Thai titles and 200 Thai paragraphs take 0.9 ms a pass
  against 0.1 ms for egui's own labels, so about 2 µs a label more; with nothing kept, 3 ms. A 1,000-character
  paragraph that grows by a word a pass takes 0.6 to 0.75 ms a pass (egui's own 0.1 to 0.2 ms). Text with no Thai pays
  one scan of its bytes. The perf gate gets a Thai case of the 200-row screen under the same 16.7 ms.
- **An egui upgrade** can change how a tiny section is shaped. Every layout counts its gap glyphs: if they do not add
  up, the text is drawn as laid and three tests fail (the probe, "not wrapped is egui's own", the snapshots).
- **Lines:** about +230 in `crates/blocks-desktop/src`. Staging is 42,815 of 44,000; with #303 and #304 about 43,760.
- **Files in the tree:** two snapshots of the Thai sample (390 wide, light and dark) and two of a Latin and CJK
  baseline. The harness writes PNGs uncompressed: about 1 MB each in the tree, 30 to 60 KB each in git.
- **`demo/egui`** has its own lock, which the PR updates. Its wasm grows by the same data; not measured, since this
  host has no wasm target.
- **Hot files:** none is converted. `arch.toml` gains one layer and three bans.

## Open questions

1. **`icu_segmenter` as a new direct dependency, at 1.11 MB.** The issue leaves it to this review. Option C is the
   same breaks for about 0.2 MB and more machinery; option B is 0.38 MB, slower and less right; option D is no crate.

## The exact lines

`Cargo.toml`, under `[workspace.dependencies]`, and `crates/blocks-desktop/Cargo.toml`, under `[dependencies]`:

```toml
icu_segmenter = { version = "2.4", default-features = false, features = ["compiled_data"] }   # blocks-desktop only
```

```toml
icu_segmenter.workspace = true
```

`docs/deps.md`, after the `egui` line:

```md
- `icu_segmenter`: ICU4X's line segmenter with its dictionaries, for Thai word breaks in `blocks-desktop` only
```

`.drover/arch.toml`: the new layer, `"desktop-words"` added to `may_use` of `desktop-look` (which has none today),
`desktop-cx`, `desktop-draw` and `desktop-stage` (and of `desktop-bidi`, if #304 has landed), and the bans:

```toml
[[layer]]
name = "desktop-words"
paths = ["crates/blocks-desktop/src/words.rs"]
mods = ["crate::words"]

[[ban]]
pattern = "icu_segmenter"
paths = ["crates/*/Cargo.toml", "crates/*/src/**"]
except = ["crates/blocks-desktop/Cargo.toml", "crates/blocks-desktop/src/words.rs"]
reason = "one module knows the segmenter: the rest ask words for a label or a layout"

[[ban]]
pattern = "ui.label("
paths = ["crates/blocks-desktop/src/**"]
except = ["crates/blocks-desktop/src/words.rs"]
reason = "a label reaches egui through words::label, which breaks Thai between words"

[[ban]]
pattern = "hyperlink_to("
paths = ["crates/blocks-desktop/src/**"]
except = ["crates/blocks-desktop/src/words.rs"]
reason = "a link is words::link, which breaks Thai between words"
```

If #304 has landed, its `ui.label(` ban is already there: `words.rs` joins its `except`, and only the
`icu_segmenter` and `hyperlink_to(` bans are new.

`.drover/rules.md`: in the layers line, `desktop-words <- desktop-look <- desktop-cx <- desktop-draw` (after
`desktop-bidi <-` if #304 has landed). If #304's line "don't hand text to egui in blocks-desktop except through bidi"
is there, its enforcer list gains "the `hyperlink_to(` ban"; else one new line (the file is at 28 of 30):

```md
- don't hand a label to egui in blocks-desktop except through words (enforced by: CI arch-check, the `ui.label(` and `hyperlink_to(` bans; CI desktop, the Thai sample's test over the kinds that wrap text)
```
