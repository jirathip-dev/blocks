use std::path::Path;

use blocks_desktop::bidi::{self, Fit};
use egui::epaint::text::{FontData, FontInsert, FontPriority, InsertFontFamily};
use egui::text::LayoutJob;
use egui::{Color32, Context, FontFamily, FontId, RawInput, RichText, Ui};

const SAMPLES: [&str; 9] = [
    "אב גד",
    "اب جد",
    "abc אבג 123",
    "מחיר 1250 שקל",
    "שלום (עולם)!",
    "السعر ۱۲۳ ريال",
    "لا إله",
    "Build נכשל on main",
    "שָׁלוֹם",
];
const PROSE: &str = "הבנייה נכשלה ב־main אחרי 12 דקות (שורה 238), ולכן המיזוג נעצר עד שהבדיקות יעברו שוב בהצלחה.";

fn ctx(fonts: bool) -> Context {
    let ctx = Context::default();
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/rtl");
    for f in ["NotoSansHebrew-Regular.ttf", "NotoSansArabic-Regular.ttf"]
        .iter()
        .filter(|_| fonts)
    {
        let families = [FontFamily::Proportional, FontFamily::Monospace].map(|family| InsertFontFamily {
            family,
            priority: FontPriority::Lowest,
        });
        let data = FontData::from_owned(std::fs::read(dir.join(f)).unwrap());
        ctx.add_font(FontInsert::new(f, data, families.into()));
    }
    ctx
}

fn pass(ctx: &Context, mut f: impl FnMut(&mut Ui)) -> Vec<String> {
    let mut full = ctx.run_ui(RawInput::default(), |ui| f(ui));
    full.textures_delta.clear();
    bidi::faults(&full.shapes)
}

fn job(text: &str, wrap: f32) -> LayoutJob {
    LayoutJob::simple(text.into(), FontId::proportional(14.0), Color32::BLACK, wrap)
}

#[test]
fn the_probe_strings_land_in_reading_order_with_the_fonts_and_with_none() {
    for fonts in [true, false] {
        let ctx = ctx(fonts);
        for text in ["אב גד", "اب جد"] {
            pass(&ctx, |ui| {
                let laid = bidi::lay(ui, &job(text, f32::INFINITY), Fit::Own).unwrap();
                let row = &laid.galley.rows[0];
                assert_eq!(row.glyphs.len(), text.chars().count(), "{text}");
                let xs: Vec<f32> = row
                    .glyphs
                    .iter()
                    .filter(|g| !g.chr.is_whitespace())
                    .map(|g| row.pos.x + g.pos.x)
                    .collect();
                assert!(xs.windows(2).all(|w| w[1] < w[0]), "{text} fonts {fonts}: {xs:?}");
            });
        }
    }
}

#[test]
fn text_with_no_right_to_left_character_is_egui_s_own() {
    pass(&ctx(true), |ui| {
        for text in ["Build green", "สั่งซื้อน้ำผึ้งป่าสองขวด", "日本語のテキスト"]
        {
            assert!(bidi::lay(ui, &job(text, 390.0), Fit::Column).is_none(), "{text}");
        }
    });
}

#[test]
fn every_sample_and_a_wrapped_paragraph_is_drawn_in_the_algorithm_s_order_and_egui_alone_is_not() {
    for fonts in [true, false] {
        let ctx = ctx(fonts);
        for width in [390.0, 200.0, 120.0] {
            let faults = pass(&ctx, |ui| {
                ui.set_max_width(width);
                for text in SAMPLES {
                    bidi::label(ui, RichText::new(text));
                }
                bidi::para(ui, PROSE);
            });
            assert!(faults.is_empty(), "fonts {fonts} at {width}: {faults:#?}");
        }
        let faults = pass(&ctx, |ui| {
            ui.label("אב גד");
            ui.label(PROSE);
        });
        assert_eq!(faults.len(), 2, "fonts {fonts}: {faults:?}");
    }
}

#[test]
fn a_right_to_left_paragraph_ends_at_the_column_s_right_edge_and_a_left_to_right_one_starts_at_its_left() {
    pass(&ctx(true), |ui| {
        let laid = bidi::lay(ui, &job(&format!("{PROSE}\nBuild green"), 200.0), Fit::Column).unwrap();
        let rows = &laid.galley.rows;
        assert!(rows.len() > 2);
        let (last, rest) = rows.split_last().unwrap();
        for r in rest {
            assert!((r.pos.x + r.size.x - 200.0).abs() < 1.0, "{:?}", r.pos);
            assert_eq!(r.pos.x, r.pos.x.round());
        }
        assert_eq!(last.pos.x, 0.0);
    });
}

fn field(ctx: &Context, text: &mut String, events: Vec<egui::Event>) -> Option<usize> {
    let input = RawInput {
        screen_rect: Some(egui::Rect::from_min_size(egui::Pos2::ZERO, egui::vec2(390.0, 100.0))),
        events,
        focused: true,
        ..RawInput::default()
    };
    let mut full = ctx.run_ui(input, |ui| {
        bidi::edit(ui, text, true, |e| e.desired_width(300.0));
    });
    full.textures_delta.clear();
    let id = ctx.memory(egui::Memory::focused)?;
    Some(
        egui::TextEdit::load_state(ctx, id)?
            .cursor
            .char_range()?
            .primary
            .index
            .0,
    )
}

fn key(key: egui::Key) -> Vec<egui::Event> {
    vec![egui::Event::Key {
        key,
        physical_key: None,
        pressed: true,
        repeat: false,
        modifiers: egui::Modifiers::NONE,
    }]
}

fn press(x: f32) -> [Vec<egui::Event>; 2] {
    let pos = egui::pos2(x, 10.0);
    let button = |pressed| egui::Event::PointerButton {
        pos,
        button: egui::PointerButton::Primary,
        pressed,
        modifiers: egui::Modifiers::NONE,
    };
    [vec![egui::Event::PointerMoved(pos), button(true)], vec![button(false)]]
}

#[test]
fn a_right_to_left_field_moves_its_caret_in_visual_order_and_a_press_lands_where_it_is() {
    let ctx = ctx(true);
    let mut text = String::from("שלום");
    field(&ctx, &mut text, vec![]);
    let [down, up] = press(295.0);
    field(&ctx, &mut text, down);
    assert_eq!(
        field(&ctx, &mut text, up),
        Some(0),
        "a press at the right edge is the text's start"
    );
    assert_eq!(field(&ctx, &mut text, key(egui::Key::ArrowLeft)), Some(1));
    assert_eq!(field(&ctx, &mut text, key(egui::Key::ArrowLeft)), Some(2));
    assert_eq!(field(&ctx, &mut text, key(egui::Key::ArrowRight)), Some(1));
    assert_eq!(field(&ctx, &mut text, vec![egui::Event::Text("א".into())]), Some(2));
    assert_eq!(text, "שאלום");
    assert_eq!(field(&ctx, &mut text, key(egui::Key::End)), Some(5));
    assert_eq!(field(&ctx, &mut text, key(egui::Key::Backspace)), Some(4));
    assert_eq!(text, "שאלו");
    let [down, up] = press(20.0);
    field(&ctx, &mut text, down);
    assert_eq!(
        field(&ctx, &mut text, up),
        Some(4),
        "a press left of the text is its end"
    );
    let mut latin = String::from("abcd");
    field(&ctx, &mut latin, vec![]);
    field(&ctx, &mut latin, key(egui::Key::Home));
    assert_eq!(
        field(&ctx, &mut latin, key(egui::Key::ArrowRight)),
        Some(1),
        "a Latin field is egui's own"
    );
}
