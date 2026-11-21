# ADR: right-to-left and mixed-direction text in `blocks-desktop` (#304)

## Summary

Decision: egui stays, and `blocks-desktop` puts text in order itself. A new `bidi` module cuts any text that has a
right-to-left character into runs by the Unicode bidi algorithm (the `unicode-bidi` crate), lets egui shape and wrap
them, then moves each row's runs into visual order; a right-to-left paragraph sits at the right edge, and a text field
draws its own caret. Text with no such character takes egui's path untouched. A prototype draws it right.
Slices: three in one PR, about 650 lines: the module and the probe test; every text through it, with snapshots; fields.
Open questions: `unicode-bidi` as a new dependency; the cap (with #296's lines the total passes 43,000 by about 260).

## Question

egui 0.37 draws Hebrew and Arabic in the wrong order and has no paragraph direction. The owner decided cooee's desktop
app needs right-to-left text. Where is it fixed: in `blocks-desktop`, in `epaint`, or somewhere else; and what does the
text field do?

## What was found

Read in `epaint` 0.37.0 and measured with the prototype in `proto/` (`measured.md` has every command and number).

1. **egui shapes one run per font and guesses each run's direction from its first letter.** It never reorders. So
   the fault depends on the fonts. When the script's font is a fallback (the harness, an app with a Latin font first),
   each word is its own run: words read right, their order is wrong. When one font has every script (measured with
   Arial), a line is one run: `מחיר 1250` draws its number as `0521`, and Hebrew inside an English line is spelled
   backwards.
2. **Its glyph list is wrong for right-to-left runs.** `אב גד` is 5 characters and 7 glyphs. Every caret, selection
   and click in egui counts one glyph per character, so a text field with Hebrew in it is wrong today, not only its
   order. This is an `epaint` bug; it is worth reporting upstream whatever is decided here.
3. **Shaping is per section of a layout job, and a section can be forced.** A text cut into sections that each hold
   one direction is shaped right, whatever the fonts. `LayoutJob::append` merges sections of one format, so they are
   pushed directly.
4. **A laid-out galley can be edited.** Its rows, glyphs and mesh are public. A `Label`, a `Button` and a tooltip take
   a ready galley; a `TextEdit` takes a function that makes one.
5. **egui's caret and click are left-to-right only.** The caret at the end of a row is drawn at the row's right edge
   and a click searches glyphs left to right. A galley cannot fix either; the field has to.

## Options

| | Option | Verdict |
|---|---|---|
| A | **Reorder in `blocks-desktop`, around egui's own layout, with `unicode-bidi`** | **chosen** |
| B | The same with the bidi algorithm written here | no: the crate's algorithm is about 2,000 lines and a 560-line table of character classes; a smaller one here would skip rules and still cost the cap, to redo a crate with no dependencies |
| C | Patch `epaint` | no: `deny.toml` refuses a git source; a copy in the tree is 8,900 lines of text code to carry across every egui release; upstream's own change would touch layout, carets and selection and is not ours to schedule |
| D | Fix the painted shapes at the end of a pass, with no caller changed | no: sizes are taken before the paint, a galley shaped as one wrong run (fact 1) cannot be repaired, and carets stay wrong |
| E | Hand egui the text already in visual order | no: copying and AccessKit would read the reversed text, and wrapping must come before reordering |
| F | A second text stack for these paragraphs (cosmic-text, parley) | no: another rasteriser, so another look and other bytes, and a dependency tree far larger than one crate |
| G | Another toolkit | no: #299 measured it; GPUI gets this wrong on Windows |

## Decision

1. **`unicode-bidi` 0.3 is a new dependency of `blocks-desktop` only.** MIT or Apache-2.0, no dependencies of its
   own, pure Rust (it builds for wasm). It gives the levels and the visual order; nothing else imports it.
2. **One module, `bidi`, is how text reaches egui in `blocks-desktop`.** `bidi::label` (a label in its own box),
   `bidi::para` (a block of text that owns its column), `bidi::text` (the text of a button, a chip, a hint, a tooltip)
   and `bidi::edit` and `bidi::area` (a text field of one row, of many). `usage.md` shows the callers.
3. **Text with no right-to-left character is not touched.** The module hands egui the same value the caller gave it,
   so Latin, Thai and CJK take today's path and draw today's bytes.
4. **Any other text is laid out in five steps** (`design.md` has the shapes):
   - *Read*: the paragraphs, each one's direction from its first strong character, and every character's level.
   - *Cut* into atoms: a left-to-right run; a right-to-left word (letters and their marks, one script); every other
     character of a right-to-left run alone (a space, a comma, a bracket, which is mirrored); a newline.
   - *Shape*: each atom is its own section, followed by a section holding one invisible mark (U+2060). egui shapes,
     wraps and tessellates as it does for any text, so lines break where Latin lines break.
   - *Place*: in each row the marks say where each atom's glyphs and vertices are. The atoms are put in visual order
     (rules L1 and L2) and their vertices moved by whole pixels. The glyph list is rebuilt: one glyph per character,
     in logical order, at its visual place.
   - *Align*: a right-to-left paragraph's rows end at the right edge of the text's box: the column for `para`, the
     widest row for `label`. The galley gets the caller's job back, so its text is the logical text.
5. **A laid galley is kept** while egui still returns the galley it was made from, which is exactly as long as it is
   valid (egui drops its galleys when the font atlas is rebuilt).
6. **A text field has two modes.** With no right-to-left character it is egui's `TextEdit`, untouched. With one, the
   field lays its text out through `bidi`, hides egui's caret and selection fill and draws its own from the laid
   lines, swaps the left and right arrows while the character before the caret is right-to-left, and sets the caret
   from a press or a drag itself. The prototype runs the layout, the caret's place and the arrows through egui's real
   events, and shows the lines giving the right index for a press where egui's is wrong; writing that index back and
   painting the selection are designed, not run.
7. **The block layout does not mirror.** A row with a Hebrew title keeps its title on the left and its value on the
   right; only the text inside each box is ordered and aligned. The HTML and SwiftUI renderers do not mirror either.
8. **Three things enforce it.** `arch.toml` bans `ui.label(`, `ui.heading(` and `TextEdit::` outside `bidi`. The
   harness faults any text drawn with its right-to-left characters out of order, on every `--check`. A test holds the
   right-to-left sample to every kind `kinds()` draws natively, so a kind added later (message, tool, prose, the
   composer) joins the sample and is checked.
9. **The composer** has no native view on the desktop yet (`draw/composer.rs` is a `TODO(#45)` fallback). `bidi::edit`
   is built and tested on the form's and the choice's fields; the composer's view uses it when it lands.

## Limits (the written limits the issue asks for)

| | Limit | Why |
|---|---|---|
| Field | At a boundary between directions the caret moves to the next character in logical order, which can be a jump on screen. Inside one direction, arrows move in visual order | true visual movement across runs is a second algorithm; most editors with logical carets do this |
| Field | Up and down land on the right row, at its start or end | egui picks the column with its left-to-right search |
| Field | A double click picks its word with egui's hit test, which is wrong in a right-to-left row. A press and a drag are right | the same search |
| Field | The input method's window follows egui's caret, so at the end of a right-to-left row it sits at the wrong end. Not measured with a real input method | egui places it |
| Label | A label with right-to-left text cannot be selected with the pointer; Latin labels can, as today | the same search; a wrong selection is worse than none |
| Draw | A long right-to-left label in a wrapping row (a row's title) wraps inside its own box; a Latin one goes on along the row's next line | a ready galley takes egui's plain label path |
| Draw | One right-to-left word wider than its line has its rows in the wrong order (`look/noto-390.png`, last block) | egui breaks the shaped run |
| Draw | A text cut to one row with an ellipsis is not reordered at its cut end. No kind cuts text today | egui edits the glyphs after wrapping |
| Draw | An underline or a background stays where egui drew it. No kind sets one today; native prose adds it in `place` | they are drawn per row before the move |
| Draw | A prose paragraph that reads right to left flows its spans from the right edge; two left-to-right spans side by side inside it come out in right-to-left span order | spans are separate labels in a wrapping row, and links stay their own widgets |
| Draw | Six bracket and quote pairs are mirrored: `()`, `[]`, `{}`, `<>`, `«»`, `‹›`. Mathematical symbols are not | a short table, not a second data crate |
| Draw | A word that needs two fonts, or an override character forcing Hebrew left to right, is drawn by egui's guess | rare; the run cannot be told apart from outside |
| Access | AccessKit's text runs still say left-to-right. Names and values are the logical text | egui sets it; no screen reader was run |

Thai line breaking at words is not part of this issue.

## Consequences

- **For apps:** right-to-left text is drawn in order and right-aligned; nothing else changes. An app's own kinds and
  islands draw with their own egui calls; they get the same by calling `blocks_desktop::bidi`.
- **Cost:** laying a row title out takes about 3 to 5 µs with nothing kept and a paragraph 12 to 24 µs, against 0.2
  µs for egui's cached galley; kept, it is two hashes. Text without right-to-left characters pays one scan of its
  bytes. The perf gate gets a right-to-left case of the 200-row screen under the same 16.7 ms.
- **An egui upgrade** can change how runs and glyphs come out. The marks are counted on every layout: if they do not
  add up the text falls back to egui's galley, the harness faults it and the probe test fails, so it is loud.
- **Lines:** about +650 in `crates/blocks-desktop/src` and `crates/blocks-desk/src`. Today's total is 41,311 of
  43,000, and #300 sized the cap for #296's 1,300.
- **Files in the tree:** two fonts for the tests, Noto Sans Hebrew (27 KB) and Noto Sans Arabic (142 KB), OFL, beside
  the Thai one; four snapshots. The harness writes PNGs uncompressed: about 650 KB each in the tree at 390 by 420,
  about 35 KB each in git.
- **Hot files:** none is converted. `arch.toml` gains one layer and four bans.

## Open questions

1. **`unicode-bidi` as a new direct dependency.** The issue leaves it to this review. Option B is the way without it.
2. **The cap.** This is about +650 and #296 is about +1,300: together 43,261, which is 261 over 43,000. Whichever
   lands second needs a raise; that is an orchestrator's issue, not a lane's edit.

## The exact lines

`Cargo.toml`, under `[workspace.dependencies]`, and `crates/blocks-desktop/Cargo.toml`, under `[dependencies]`:

```toml
unicode-bidi = "0.3"           # blocks-desktop only
```

```toml
unicode-bidi.workspace = true
```

`docs/deps.md`, after the `egui` line:

```md
- `unicode-bidi`: the Unicode bidirectional algorithm, for right-to-left text in `blocks-desktop` only; no dependencies of its own
```

`.drover/arch.toml`: the new layer, `"desktop-bidi"` added to `may_use` of `desktop-look` (which has none today),
`desktop-cx`, `desktop-draw` and `desktop-stage`, and the bans:

```toml
[[layer]]
name = "desktop-bidi"
paths = ["crates/blocks-desktop/src/bidi.rs", "crates/blocks-desktop/src/bidi/**"]
mods = ["crate::bidi"]

[[ban]]
pattern = "unicode_bidi"
paths = ["crates/*/src/**"]
except = ["crates/blocks-desktop/src/bidi.rs", "crates/blocks-desktop/src/bidi/**"]
reason = "one module knows the bidi algorithm: the rest ask bidi for a galley"

[[ban]]
pattern = "ui.label("
paths = ["crates/blocks-desktop/src/**"]
except = ["crates/blocks-desktop/src/bidi.rs", "crates/blocks-desktop/src/bidi/**"]
reason = "text reaches egui through bidi::label, para or text, which put right-to-left text in visual order"

[[ban]]
pattern = "ui.heading("
paths = ["crates/blocks-desktop/src/**"]
reason = "a heading is bidi::label with a heading's RichText"

[[ban]]
pattern = "TextEdit::"
paths = ["crates/blocks-desktop/src/**"]
except = ["crates/blocks-desktop/src/bidi.rs", "crates/blocks-desktop/src/bidi/**"]
reason = "a text field is bidi::edit, which draws the caret of a right-to-left line"
```

`.drover/rules.md`: in the layers line, `desktop-bidi <- desktop-look <- desktop-cx <- desktop-draw`; and one new line:

```md
- don't hand text to egui in blocks-desktop except through bidi (enforced by: CI arch-check, the `ui.label(`, `ui.heading(` and `TextEdit::` bans; CI desktop, `blocks-desk --check`'s order fault and the right-to-left sample's test over `kinds()`)
```
