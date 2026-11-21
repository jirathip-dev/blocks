# Usage: how the callers read (#306)

Sketches, not final code. `words` is `crates/blocks-desktop/src/words.rs`. They are written as if #304 had not landed;
if it has, a kind keeps calling `bidi` and these calls sit inside `bidi` (`design.md`, section 2).

## A kind's file

A kind never calls `ui.label` or `hyperlink_to`. It hands its text to `words`, which decides whether there is
anything to do.

```rust
// draw/text.rs: a block of text.
fn draw(b: &Text, ui: &mut Ui, cx: &mut Cx<'_>) {
    let Some(s) = b.markdown.as_ref().or(b.text.as_ref()) else { return };
    let mut t = RichText::new(s).color(cx.look.tone(ui, b.tone.as_ref()));
    if b.style == Some(TextStyle::Footnote) {
        t = t.small();
    }
    words::label(ui, t);
}

// draw/row.rs: labels along a wrapping row. A long Thai value goes on after the title and down a line, as a Latin one does.
ui.horizontal_wrapped(|ui| {
    ui.vertical(|ui| {
        words::label(ui, RichText::new(&b.title).color(look.fg(ui)));
    });
    if let Some(v) = &b.value {
        words::label(ui, RichText::new(text(v)).color(look.mute(ui)));
    }
});

// draw/card.rs: a title that may be tapped.
let t = words::sensing(ui, title, sense);

// draw/prose.rs: the spans of a paragraph, one after another along a wrapping row.
match &s.link {
    Some(url) => words::link(ui, t.color(look.link(ui)).underline(), url),
    None => words::label(ui, t),
};

// A label that does not wrap is not words' business, and reads as today.
ui.add(Label::new(RichText::new(&b.name).strong().color(look.fg(ui))).truncate());
```

All three hand egui exactly what they were given when the text has no Thai, when the label does not wrap, or when the
Thai in it has no place to break.

## A text field

```rust
// draw/form.rs, draw/choice.rs: one row, which never wraps. Unchanged.
let edit = TextEdit::singleline(&mut text).hint_text(hint);

// The composer, when its view lands (TODO(#45)): many rows, so its layouter is words::lay.
let mut layouter = |ui: &Ui, buf: &dyn TextBuffer, width: f32| {
    words::lay(ui, LayoutJob::simple(buf.as_str().to_owned(), font.clone(), look.fg(ui), width))
};
TextEdit::multiline(&mut draft).desired_rows(1).layouter(&mut layouter).show(ui);
```

The galley `lay` returns holds the field's own text, so egui's caret, selection and keys work on it unchanged.

## An app's own kind or island

An app draws these with its own egui calls, which `blocks-desktop` cannot see. The same functions are public:

```rust
kit.kind("x-note", |ui, block, out| {
    blocks_desktop::words::label(ui, note_text(block));
});
```

## The tests

```rust
// crates/blocks-desk/tests/thai.rs: the spike's probe, now in the workspace, on the three OSes desktop.yml runs.
const LINE: &str = "ภาษาไทยไม่มีช่องว่างระหว่างคำ";
const WORDS: [&str; 8] = ["ภาษา", "ไทย", "ไม่", "มี", "ช่อง", "ว่าง", "ระหว่าง", "คำ"];

#[test]
fn the_probe_line_at_120_points_breaks_only_between_its_words() {
    let rows = lines(&lay(&ui, LINE, 120.0));
    assert!(rows.len() > 1, "{rows:?}");
    assert!(ends(&rows).iter().all(|e| word_ends(&WORDS).contains(e)), "{rows:?}");
}

// Latin and CJK are not softened at all: the galley is the one egui's cache holds.
#[test]
fn text_with_no_thai_is_egui_s_own() {
    for text in ["Build green on main, 12 minutes", "日本語のテキストは単語の間にスペースがありません"] {
        assert!(Arc::ptr_eq(&lay(&ui, text, 120.0), &own(&ui, text, 120.0)));
    }
}

// Softening moves where rows break and nothing else.
#[test]
fn thai_that_fits_its_row_is_laid_as_egui_lays_it() {
    let (ours, egui) = (lay(&ui, LINE, f32::INFINITY), own(&ui, LINE, f32::INFINITY));
    assert_eq!(places(&ours), places(&egui));
    assert_eq!(ours.text(), LINE);
}

// The snapshots, byte for byte.
#[test]
fn the_thai_sample_is_the_checked_in_png_in_light_and_dark() {
    for mode in [Mode::Light, Mode::Dark] {
        assert_eq!(shot(sample(mode)).png, std::fs::read(thai().join(name(mode))).unwrap());
    }
}
```

## The harness

Nothing new: the Thai sample is drawn by the flags `blocks-desk` already has.

```sh
blocks-desk --screen crates/blocks-desk/tests/thai/screen.json --size 390x640 --scheme dark --check \
  --font crates/blocks-desk/tests/thai/NotoSansThai-Regular.ttf --out shots/desktop/thai
```
