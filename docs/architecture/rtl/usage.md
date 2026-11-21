# Usage: how the callers read (#304)

Sketches, not final code. `bidi` is `crates/blocks-desktop/src/bidi.rs`.

## A kind's file

A kind never calls `ui.label`, `ui.heading` or `TextEdit::`. It says what the text is, and `bidi` decides how it is set.

```rust
// draw/text.rs: a block of text. It owns its column: a right-to-left paragraph ends at the right edge.
fn draw(b: &Text, ui: &mut Ui, cx: &mut Cx<'_>) {
    let Some(s) = b.markdown.as_ref().or(b.text.as_ref()) else { return };
    let mut t = RichText::new(s).color(cx.look.tone(ui, b.tone.as_ref()));
    if b.style == Some(TextStyle::Footnote) {
        t = t.small();
    }
    bidi::para(ui, t);
}

// draw/row.rs: labels side by side. Each keeps its own box, so the value stays where it was.
ui.horizontal_wrapped(|ui| {
    ui.vertical(|ui| {
        bidi::label(ui, RichText::new(&b.title).color(look.fg(ui)));
    });
    if let Some(v) = &b.value {
        bidi::label(ui, RichText::new(text(v)).color(look.mute(ui)));
    }
});

// draw/screen.rs: a heading is a label.
bidi::label(ui, RichText::new(t).heading().color(cx.look.fg(ui)));

// Anything else that shows text takes `bidi::text`: a button, a chip, a card's tappable title, a hint, a tooltip.
act::press(ui, cx, action, Button::new(bidi::text(ui, &b.label)));
ui.add(Label::new(bidi::text(ui, title)).sense(sense));
bidi::label(ui, g).on_hover_text(bidi::text(ui, word));
```

`para` is for `text`, a section's footer, a form's note, and later a prose paragraph and a message's text. Every other
label is `label`. All three hand egui exactly what they were given when the text has no right-to-left character.

## A text field

```rust
// draw/form.rs: a field. `edit` makes the TextEdit; the closure sets what the caller used to set on it.
let out = bidi::edit(ui, &mut text, |e| e.hint_text(bidi::text(ui, hint)).desired_width(ui.available_width()));
cx.rec.field(key, out.response.rect, on);

// The composer, when its view lands: the same, many rows.
let out = bidi::area(ui, &mut draft, |e| e.desired_rows(1).hint_text(bidi::text(ui, hint)));
```

A secret's field (`password(true)`) shows dots and stays in egui's mode whatever is typed.

## An app's own kind or island

An app draws these with its own egui calls, which `blocks-desktop` cannot see. The same functions are public:

```rust
kit.kind("x-note", |ui, block, out| {
    blocks_desktop::bidi::para(ui, note_text(block));
});
```

## The tests

```rust
// crates/blocks-desk/tests/rtl.rs: the spike's probe, now in the workspace. It holds with and without the fonts.
#[test]
fn the_probe_strings_land_in_reading_order() {
    for text in ["אב גד", "اب جد"] {
        let laid = lay(&ctx, text);
        let xs: Vec<f32> = letters(&laid).map(|g| g.pos.x).collect();
        assert!(xs.windows(2).all(|w| w[1] < w[0]), "{text}: {xs:?}");
    }
}

// Latin, Thai and CJK are not laid by bidi at all: egui's own galley is what is drawn.
#[test]
fn text_with_no_right_to_left_character_is_egui_s_own() {
    for text in ["Build green", "สั่งซื้อน้ำผึ้งป่าสองขวด", "日本語のテキスト"] {
        assert!(bidi::lay(&ui, job(text), Fit::Column).is_none());
    }
}

// The snapshots, byte for byte, on the three OSes the desktop workflow already runs.
#[test]
fn the_right_to_left_sample_is_the_checked_in_png_in_light_and_dark() {
    for mode in [Mode::Light, Mode::Dark] {
        assert_eq!(shot(sample(mode)).png, std::fs::read(rtl().join(name(mode))).unwrap());
    }
}
```

## The harness

```sh
blocks-desk --screen crates/blocks-desk/tests/rtl/screen.json --size 390x420 --scheme dark --check \
  --font crates/blocks-desk/tests/rtl/NotoSansHebrew-Regular.ttf \
  --font crates/blocks-desk/tests/rtl/NotoSansArabic-Regular.ttf --out shots/desktop/rtl
```

`--font` may be given more than once. `--check` now also fails with a line such as
`s: "אב גד" is drawn out of order` when a text reached egui without `bidi`.
