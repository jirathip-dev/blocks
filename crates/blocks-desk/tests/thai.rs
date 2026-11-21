use std::collections::BTreeSet;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use blocks::theme::Mode;
use blocks::tree::Step;
use blocks::Block;
use blocks_desk::Desk;
use blocks_desktop::{words, Kit, Look};
use egui::epaint::text::{FontData, FontInsert, FontPriority, InsertFontFamily};
use egui::text::LayoutJob;
use egui::{
    Color32, Context, Event, FontFamily, FontSelection, Galley, OutputCommand, PointerButton, Pos2, RawInput, Rect,
    RichText, Ui, Vec2, WidgetText,
};
use serde_json::json;

const LINE: &str = "ภาษาไทยไม่มีช่องว่างระหว่างคำ";
const WORDS: [&str; 8] = ["ภาษา", "ไทย", "ไม่", "มี", "ช่อง", "ว่าง", "ระหว่าง", "คำ"];

fn dir(name: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("tests").join(name)
}

fn font() -> Vec<u8> {
    std::fs::read(dir("thai").join("NotoSansThai-Regular.ttf")).unwrap()
}

fn shot(name: &str, mode: Mode, height: u16, font: Option<Vec<u8>>) -> Vec<u8> {
    let screen: Block = serde_json::from_str(&std::fs::read_to_string(dir(name).join("screen.json")).unwrap()).unwrap();
    let look = Look {
        mode: Some(mode),
        still: true,
        ..Look::default()
    };
    let mut desk = Desk::new(screen).size(390, height).kit(Kit::new(look));
    let mut steps: Vec<Step> = serde_json::from_value(json!([{"shot": {"name": "s"}}])).unwrap();
    if let Some(f) = font {
        desk = desk.font(f);
        steps = serde_json::from_str(&std::fs::read_to_string(dir(name).join("script.json")).unwrap()).unwrap();
    }
    let mut run = desk.run(&steps);
    run.check(&blocks_desk::Want::default());
    assert!(run.faults.is_empty(), "{:?}", run.faults);
    run.shots.remove(0).png
}

fn same(name: &str, height: u16, font: Option<&[u8]>) {
    for (mode, file) in [(Mode::Light, "light-390.png"), (Mode::Dark, "dark-390.png")] {
        let png = shot(name, mode, height, font.map(<[u8]>::to_vec));
        let want = std::fs::read(dir(name).join(file)).unwrap();
        assert!(png == want, "{name}/{file} differs from the checked-in PNG");
    }
}

#[test]
fn latin_and_cjk_are_the_checked_in_pngs_in_light_and_dark() {
    same("latin", 264, None);
}

#[test]
fn the_thai_sample_is_the_checked_in_pngs_in_light_and_dark() {
    same("thai", 624, Some(&font()));
}

fn kinds(v: &serde_json::Value, out: &mut BTreeSet<String>) {
    match v {
        serde_json::Value::Object(m) => {
            if let Some(serde_json::Value::String(t)) = m.get("type") {
                out.insert(t.clone());
            }
            m.values().for_each(|v| kinds(v, out));
        }
        serde_json::Value::Array(a) => a.iter().for_each(|v| kinds(v, out)),
        _ => {}
    }
}

#[test]
fn the_thai_sample_holds_every_kind_that_wraps_text() {
    let v: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(dir("thai").join("screen.json")).unwrap()).unwrap();
    let mut all = BTreeSet::new();
    kinds(&v, &mut all);
    for k in ["text", "prose", "row", "card", "message", "tool", "composer"] {
        assert!(all.contains(k), "the sample has no {k}: {all:?}");
    }
}

fn ctx() -> Context {
    let ctx = Context::default();
    let families = [FontFamily::Proportional, FontFamily::Monospace].map(|family| InsertFontFamily {
        family,
        priority: FontPriority::Lowest,
    });
    ctx.add_font(FontInsert::new("thai", FontData::from_owned(font()), families.into()));
    ctx
}

fn pass<R>(ctx: &Context, events: Vec<Event>, mut f: impl FnMut(&mut Ui) -> R) -> (R, Vec<OutputCommand>) {
    let input = RawInput {
        screen_rect: Some(Rect::from_min_size(Pos2::ZERO, Vec2::new(400.0, 400.0))),
        events,
        ..RawInput::default()
    };
    let mut out = None;
    let mut full = ctx.run_ui(input, |ui| out = Some(f(ui)));
    full.textures_delta.clear();
    (out.unwrap(), full.platform_output.commands)
}

fn job(ui: &Ui, text: &str, wrap: f32) -> LayoutJob {
    let text = WidgetText::from(RichText::new(text).color(Color32::BLACK));
    let mut job = Arc::unwrap_or_clone(text.into_layout_job(ui.style(), FontSelection::Default, ui.text_valign()));
    job.wrap.max_width = wrap;
    job
}

fn own(ui: &Ui, text: &str, wrap: f32) -> Arc<Galley> {
    ui.fonts_mut(|f| f.layout_job(job(ui, text, wrap)))
}

fn lay(ui: &Ui, text: &str, wrap: f32) -> Arc<Galley> {
    words::lay(ui, job(ui, text, wrap))
}

fn lines(g: &Galley) -> Vec<String> {
    let glyphs: usize = g.rows.iter().map(|r| r.glyphs.len()).sum();
    let split = glyphs > g.job.text.chars().count();
    let mut chars = g.job.text.chars();
    g.rows
        .iter()
        .map(|r| {
            let mut left = r.glyphs.len();
            let mut line = String::new();
            while left > 0 {
                let Some(c) = chars.next() else { break };
                left = left.saturating_sub(if split && c == '\u{0E33}' { 2 } else { 1 });
                line.push(c);
            }
            line
        })
        .collect()
}

fn on_words(rows: &[String]) -> bool {
    let ends: Vec<usize> = WORDS
        .iter()
        .scan(0, |at, w| {
            *at += w.len();
            Some(*at)
        })
        .collect();
    rows.iter()
        .scan(0, |at, r| {
            *at += r.len();
            Some(*at)
        })
        .all(|e| ends.contains(&e))
}

#[test]
fn the_probe_line_at_120_points_breaks_only_between_its_words() {
    let ctx = ctx();
    let ((ours, egui, wide), _) = pass(&ctx, vec![], |ui| {
        (
            lines(&lay(ui, LINE, 120.0)),
            lines(&own(ui, LINE, 120.0)),
            lay(ui, LINE, 390.0).rows.len(),
        )
    });
    assert!(ours.len() > 1, "{ours:?}");
    assert_eq!(ours.concat(), LINE);
    assert!(on_words(&ours), "{ours:?}");
    assert!(!on_words(&egui), "egui alone breaks inside a word: {egui:?}");
    assert_eq!(wide, 1);
}

#[test]
fn text_with_no_thai_is_egui_s_own() {
    let ctx = ctx();
    for text in [
        "Build green on main, 12 minutes",
        "日本語のテキストは単語の間にスペースがありません",
    ] {
        let (same, _) = pass(&ctx, vec![], |ui| {
            Arc::ptr_eq(&lay(ui, text, 120.0), &own(ui, text, 120.0))
        });
        assert!(same, "{text}");
    }
}

#[test]
fn thai_that_fits_its_row_is_laid_as_egui_lays_it() {
    let places = |g: &Galley| -> Vec<(char, Pos2)> {
        g.rows
            .iter()
            .flat_map(|r| r.glyphs.iter().map(|x| (x.chr, x.pos)))
            .collect()
    };
    let ((ours, egui), _) = pass(&ctx(), vec![], |ui| {
        (lay(ui, LINE, f32::INFINITY), own(ui, LINE, f32::INFINITY))
    });
    assert_eq!(ours.text(), LINE);
    assert_eq!(places(&ours), places(&egui));
    assert_eq!(ours.size(), egui.size());
}

#[test]
fn a_word_wider_than_its_line_still_breaks_inside_itself() {
    let word = "ประชาธิปไตย";
    let (rows, _) = pass(&ctx(), vec![], |ui| lines(&lay(ui, word, 30.0)));
    assert!(rows.len() > 1, "{rows:?}");
    assert_eq!(rows.concat(), word);
}

#[test]
fn a_drag_over_a_wrapped_label_and_a_copy_give_its_text() {
    let ctx = ctx();
    let label = |ui: &mut Ui| {
        ui.set_max_width(120.0);
        let r = words::label(ui, LINE);
        r.rect
    };
    let (rect, _) = pass(&ctx, vec![], label);
    assert!(rect.height() > 20.0, "{rect:?}");
    let button = |pos, pressed| Event::PointerButton {
        pos,
        button: PointerButton::Primary,
        pressed,
        modifiers: egui::Modifiers::NONE,
    };
    let (start, end) = (
        rect.left_top() + Vec2::new(1.0, 2.0),
        rect.right_bottom() - Vec2::new(1.0, 2.0),
    );
    pass(&ctx, vec![Event::PointerMoved(start), button(start, true)], label);
    pass(&ctx, vec![Event::PointerMoved(end)], label);
    pass(&ctx, vec![button(end, false)], label);
    let (_, commands) = pass(&ctx, vec![Event::Copy], label);
    assert!(commands.contains(&OutputCommand::CopyText(LINE.into())), "{commands:?}");
}

#[test]
fn the_composer_takes_thai_keys_and_sends_the_typed_text() {
    let screen: Block = serde_json::from_value(json!({"type": "screen", "id": "s", "blocks": [
        {"type": "composer", "id": "say", "action": "say"}
    ]}))
    .unwrap();
    let typed = format!("{LINE}{LINE}{LINE}");
    let steps: Vec<Step> = serde_json::from_value(json!([
        {"tap": {"id": "say"}},
        {"type": {"id": "say", "text": typed}},
        {"tap": {"id": "say"}}
    ]))
    .unwrap();
    let run = Desk::new(screen).size(390, 300).font(font()).run(&steps);
    let [sent] = run.report.sent.try_into().unwrap();
    assert_eq!(sent.values.get("text").and_then(|v| v.as_str()), Some(typed.as_str()));
}
