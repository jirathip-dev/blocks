mod bidi;
#[path = "../../../../../crates/blocks-desk/src/png.rs"]
mod png;
#[path = "../../../../../crates/blocks-desk/src/raster.rs"]
mod raster;

use std::sync::Arc;

use egui::epaint::text::{FontData, FontInsert, FontPriority, InsertFontFamily};
use egui::text::{CCursor, CCursorRange, LayoutJob};
use egui::{
    Color32, Context, FontFamily, FontSelection, Galley, Pos2, RawInput, Rect, RichText, Stroke, TextEdit, Ui, Vec2,
    WidgetText,
};
use unicode_bidi::BidiInfo;

use crate::bidi::{Fit, Laid};

const HEBREW: &str = "אב גד";
const ARABIC: &str = "اب جد";
const SAMPLES: [&str; 9] = [
    HEBREW,
    ARABIC,
    "abc אבג 123",
    "מחיר 1250 שקל",
    "שלום (עולם)!",
    "السعر ۱۲۳ ريال",
    "لا إله",
    "Build נכשל on main",
    "שָׁלוֹם",
];
const PROSE: &str = "הבנייה של הענף main נכשלה אחרי 12 דקות, ראו את היומן (שורה 238) לפרטים נוספים על השגיאה.";
const USAGE: &str =
    "usage: rtl-proto probe | shot <png> | caret | edge | bench | keys   [--font <ttf>]... [--first <ttf>]";

fn ctx(low: &[String], first: Option<&String>) -> Context {
    let ctx = Context::default();
    ctx.set_visuals(egui::Visuals::light());
    ctx.global_style_mut(|s| s.animation_time = 0.0);
    let add = |name: &str, path: &String, priority| {
        let data = std::fs::read(path).unwrap_or_else(|e| panic!("{path}: {e}"));
        let families =
            [FontFamily::Proportional, FontFamily::Monospace].map(|family| InsertFontFamily { family, priority });
        ctx.add_font(FontInsert::new(name, FontData::from_owned(data), families.into()));
    };
    for (i, path) in low.iter().enumerate() {
        add(&format!("low{i}"), path, FontPriority::Lowest);
    }
    if let Some(path) = first {
        add("first", path, FontPriority::Highest);
    }
    ctx
}

fn job(ui: &Ui, text: &str, wrap: f32) -> LayoutJob {
    let text = WidgetText::from(RichText::new(text).color(Color32::BLACK));
    let mut job = Arc::unwrap_or_clone(text.into_layout_job(ui.style(), FontSelection::Default, ui.text_valign()));
    job.wrap.max_width = wrap;
    job
}

fn raw(ui: &Ui, text: &str, wrap: f32) -> Arc<Galley> {
    let job = job(ui, text, wrap);
    ui.fonts_mut(|f| f.layout_job(job))
}

fn lay(ui: &Ui, text: &str, wrap: f32, fit: Fit) -> Option<Laid> {
    let job = job(ui, text, wrap);
    ui.fonts_mut(|f| bidi::lay(f, job, fit))
}

fn once<R>(ctx: &Context, mut f: impl FnMut(&mut Ui) -> R) -> R {
    let mut out = None;
    let mut full = ctx.run_ui(RawInput::default(), |ui| out = Some(f(ui)));
    full.textures_delta.clear();
    out.unwrap()
}

fn letters(text: &str, g: &Galley) -> Vec<f32> {
    let glyphs: Vec<_> = g.rows.iter().flat_map(|r| r.glyphs.iter()).collect();
    let mut taken = vec![false; glyphs.len()];
    text.chars()
        .filter(|c| !c.is_whitespace())
        .filter_map(|c| {
            let i = (0..glyphs.len()).find(|&i| !taken[i] && glyphs[i].chr == c && glyphs[i].advance_width > 0.0)?;
            taken[i] = true;
            Some(glyphs[i].pos.x)
        })
        .collect()
}

fn order(xs: &[f32]) -> &'static str {
    let falls = xs.windows(2).all(|w| w[1] < w[0]);
    let rises = xs.windows(2).all(|w| w[1] > w[0]);
    match (falls, rises) {
        (true, _) => "right-to-left",
        (_, true) => "left-to-right",
        _ => "mixed",
    }
}

fn seen(s: &Laid) -> Vec<String> {
    let rows = s.galley.rows.iter().zip(&s.lines);
    rows.map(|(row, line)| {
        let mut at: Vec<(f32, usize, char)> = row
            .glyphs
            .iter()
            .enumerate()
            .map(|(i, g)| (line.cells[i].x, i, g.chr))
            .collect();
        at.sort_by(|a, b| {
            a.0.total_cmp(&b.0).then(if line.cells[a.1].rtl {
                b.1.cmp(&a.1)
            } else {
                a.1.cmp(&b.1)
            })
        });
        at.into_iter().map(|a| a.2).collect()
    })
    .collect()
}

fn wanted(s: &Laid) -> Vec<String> {
    let text = s.galley.text();
    let info = BidiInfo::new(text, None);
    let mut at = 0;
    let rows = s.galley.rows.iter();
    rows.map(|row| {
        let bytes: usize = text[at..].chars().take(row.glyphs.len()).map(char::len_utf8).sum();
        let para = info.paragraphs.iter().find(|p| p.range.contains(&at)).unwrap();
        let line = info.reorder_line(para, at..at + bytes).into_owned();
        at += bytes + usize::from(row.ends_with_newline);
        line
    })
    .collect()
}

fn probe(ctx: &Context, name: &str) {
    println!("## {name}");
    for text in SAMPLES {
        let (r, s) = once(ctx, |ui| {
            (raw(ui, text, f32::INFINITY), lay(ui, text, f32::INFINITY, Fit::Own))
        });
        let s = s.expect("a laid galley");
        let n = text.chars().count();
        let (rx, sx) = (letters(text, &r), letters(text, &s.galley));
        let glyphs = |g: &Galley| g.rows.iter().map(|r| r.glyphs.len()).sum::<usize>();
        println!("{text:?} chars={n}");
        println!("  egui: glyphs={} order={} x={rx:?}", glyphs(&r), order(&rx));
        println!("  bidi: glyphs={} order={} x={sx:?}", glyphs(&s.galley), order(&sx));
        println!(
            "  bidi draws {:?}, UAX 9 wants {:?}: {}",
            seen(&s),
            wanted(&s),
            if seen(&s) == wanted(&s) { "same" } else { "DIFFERENT" }
        );
    }
    for width in [390.0, 200.0, 120.0] {
        let s = once(ctx, |ui| lay(ui, PROSE, width, Fit::Column)).expect("a laid galley");
        let same = seen(&s) == wanted(&s);
        let right = s.galley.rows.iter().all(|r| (r.pos.x + r.size.x - width).abs() < 1.0);
        let whole = s
            .galley
            .rows
            .iter()
            .flat_map(|r| &r.glyphs)
            .all(|g| g.pos.x.fract() == 0.0);
        println!(
            "prose at {width}: rows={} order={} right_edge={right} whole_pixels={whole}",
            s.galley.rows.len(),
            if same { "same" } else { "DIFFERENT" }
        );
        let n: usize = s
            .galley
            .rows
            .iter()
            .map(|r| r.glyphs.len() + usize::from(r.ends_with_newline))
            .sum();
        assert_eq!(n, PROSE.chars().count());
    }
    let plain = "Build green on main, 12 minutes";
    let (r, s) = once(ctx, |ui| (raw(ui, plain, 200.0), lay(ui, plain, 200.0, Fit::Column)));
    println!(
        "latin: bidi is {}, egui's own galley has {} rows",
        if s.is_none() { "not made" } else { "MADE" },
        r.rows.len()
    );
}

fn label(ui: &mut Ui, text: &str, fit: Fit) {
    match lay(ui, text, ui.available_width(), fit) {
        Some(s) => ui.label(s.galley),
        None => ui.label(RichText::new(text).color(Color32::BLACK)),
    };
}

fn column(ui: &mut Ui, edit: &mut String, caret: Option<usize>) {
    ui.visuals_mut().override_text_color = Some(Color32::BLACK);
    ui.label(RichText::new("egui 0.37 as it is").color(Color32::GRAY));
    for text in SAMPLES {
        ui.label(RichText::new(text).color(Color32::BLACK));
    }
    ui.label(RichText::new(PROSE).color(Color32::BLACK));
    ui.separator();
    ui.label(RichText::new("with bidi: a label keeps its own box").color(Color32::GRAY));
    for text in SAMPLES {
        label(ui, text, Fit::Own);
    }
    ui.separator();
    ui.label(RichText::new("with bidi: a block of text owns the column").color(Color32::GRAY));
    label(ui, PROSE, Fit::Column);
    label(
        ui,
        "A left-to-right paragraph with one word, שלום, inside it stays at the left edge.",
        Fit::Column,
    );
    ui.separator();
    ui.label(RichText::new("with bidi: a text field, its caret drawn from the lines").color(Color32::GRAY));
    let mut last = None;
    let mut lay = |ui: &Ui, text: &dyn egui::TextBuffer, wrap: f32| {
        let s = lay(ui, text.as_str(), wrap, Fit::Column);
        let galley = s
            .as_ref()
            .map_or_else(|| raw(ui, text.as_str(), wrap), |s| Arc::clone(&s.galley));
        last = s;
        galley
    };
    let id = ui.scope_id().with("edit");
    if let Some(at) = caret {
        let mut state = TextEdit::load_state(ui.ctx(), id).unwrap_or_default();
        state.cursor.set_char_range(Some(CCursorRange::one(CCursor::new(at))));
        TextEdit::store_state(ui.ctx(), id, state);
        ui.memory_mut(|m| m.request_focus(id));
    }
    let out = TextEdit::multiline(edit)
        .id(id)
        .desired_width(f32::INFINITY)
        .desired_rows(2)
        .layouter(&mut lay)
        .show(ui);
    if let (Some(s), Some(at)) = (last, caret) {
        let x = out.galley_pos.x + s.caret(at);
        let (top, bottom) = (out.galley_pos.y, out.galley_pos.y + s.galley.rows[0].height());
        ui.painter().line_segment(
            [Pos2::new(x, top), Pos2::new(x, bottom)],
            Stroke::new(2.0, Color32::RED),
        );
    }
    ui.separator();
    ui.label(RichText::new("the limit: one word wider than the line (the alphabet, three times)").color(Color32::GRAY));
    label(ui, &"אבגדהוזחטיכלמנסעפצקרשת".repeat(3), Fit::Column);
}

fn shot(ctx: &Context, path: &str) {
    let (w, h) = (390u16, 700u16);
    let mut textures = raster::Textures::default();
    let mut canvas = raster::Canvas::new(w, h);
    let mut edit = String::from("שלום עולם abc");
    for pass in 0..3 {
        let input = RawInput {
            screen_rect: Some(Rect::from_min_size(Pos2::ZERO, Vec2::new(f32::from(w), f32::from(h)))),
            ..RawInput::default()
        };
        let mut full = ctx.run_ui(input, |ui| {
            ui.painter().rect_filled(ui.max_rect(), 0.0, Color32::from_gray(246));
            egui::Frame::new()
                .inner_margin(12.0)
                .show(ui, |ui| column(ui, &mut edit, (pass > 0).then_some(4)));
        });
        textures.update(&full.textures_delta);
        let prims = ctx.tessellate(full.shapes, full.pixels_per_point);
        canvas.paint(&prims, &textures);
        textures.free(&full.textures_delta);
        full.textures_delta.clear();
    }
    std::fs::write(path, canvas.png()).unwrap();
    println!("wrote {path}");
}

fn caret(ctx: &Context) {
    for text in ["אבג", "abc אבג", "אבג abc", "שלום עולם"] {
        let s = once(ctx, |ui| lay(ui, text, 300.0, Fit::Column)).expect("a laid galley");
        let n = text.chars().count();
        let xs: Vec<f32> = (0..=n).map(|i| s.caret(i)).collect();
        let back: Vec<usize> = xs.iter().map(|x| s.index_at(0, *x)).collect();
        let rtl: Vec<bool> = (0..=n).map(|i| s.rtl_at(i)).collect();
        let egui_end = s.galley.pos_from_cursor(CCursor::new(n)).min.x;
        println!("{text:?}: caret x by index {xs:?}; index back from x {back:?}; arrows swapped {rtl:?}; egui's own caret at the end {egui_end}");
    }
}

fn edge(ctx: &Context) {
    let rows = |s: &Laid| -> Vec<String> {
        let all = s.galley.rows.iter().zip(&s.lines);
        all.map(|(r, l)| {
            format!(
                "{}@{:.0}+{:.0}{}",
                if l.rtl { "rtl" } else { "ltr" },
                r.pos.x,
                r.size.x,
                if r.ends_with_newline { "/n" } else { "" }
            )
        })
        .collect()
    };
    let mixed = "שלום\nhello\n\nעולם abc";
    let s = once(ctx, |ui| lay(ui, mixed, 300.0, Fit::Column)).expect("a laid galley");
    println!(
        "three paragraphs and an empty one at 300: rows {:?}, order {}",
        rows(&s),
        if seen(&s) == wanted(&s) { "same" } else { "DIFFERENT" }
    );
    let s = once(ctx, |ui| lay(ui, mixed, 300.0, Fit::Own)).expect("a laid galley");
    println!(
        "the same in its own box: rows {:?}, galley {:?}",
        rows(&s),
        s.galley.rect
    );
    for (name, align) in [("centre", egui::Align::Center), ("right", egui::Align::RIGHT)] {
        let s = once(ctx, |ui| {
            let mut job = job(ui, PROSE, 200.0);
            job.halign = align;
            ui.fonts_mut(|f| bidi::lay(f, job, Fit::Column))
        })
        .expect("a laid galley");
        println!("{name} at 200: rows {:?}, galley {:?}", rows(&s), s.galley.rect);
    }
    let long = "אבגדהוזחטיכלמנסעפצקרשתאבגדהוזחטיכלמנסעפצקרשת";
    let s = once(ctx, |ui| lay(ui, long, 120.0, Fit::Column)).expect("a laid galley");
    let n: usize = s.galley.rows.iter().map(|r| r.glyphs.len()).sum();
    println!(
        "one word wider than 120: rows {:?}, glyphs {n} of {} chars; its rows are drawn in the wrong order (the shot)",
        rows(&s),
        long.chars().count()
    );
    let cut = once(ctx, |ui| {
        let mut job = job(ui, PROSE, 200.0);
        job.wrap.max_rows = 1;
        ui.fonts_mut(|f| bidi::lay(f, job, Fit::Column))
    });
    println!(
        "cut to one row with an ellipsis: {}",
        cut.map_or("not laid: egui's galley is used as it is".into(), |s| format!(
            "rows {:?} elided {}",
            rows(&s),
            s.galley.elided
        ))
    );
    let (one, multi) = once(ctx, |ui| {
        let same = |t: &str| Arc::ptr_eq(&raw(ui, t, 200.0), &raw(ui, t, 200.0));
        (same(PROSE), same(mixed))
    });
    println!("egui hands back the same galley for the same job in a pass: one paragraph {one}, several {multi}");
    ctx.set_pixels_per_point(2.0);
    let s = once(ctx, |ui| lay(ui, PROSE, 200.0, Fit::Column)).expect("a laid galley");
    let whole = s
        .galley
        .rows
        .iter()
        .flat_map(|r| &r.glyphs)
        .all(|g| (g.pos.x * 2.0).fract() == 0.0);
    println!(
        "at scale 2, prose at 200: scale {} rows {} order {} whole_pixels={whole}",
        s.galley.pixels_per_point,
        s.galley.rows.len(),
        if seen(&s) == wanted(&s) { "same" } else { "DIFFERENT" }
    );
    ctx.set_pixels_per_point(1.0);
    for text in ["می\u{200c}خواهم", "لا إله إلا الله", "שָׁלוֹם עֲלֵיכֶם", PROSE] {
        let s = once(ctx, |ui| lay(ui, text, 390.0, Fit::Column)).expect("a laid galley");
        println!(
            "{text:?}: {} right-to-left words, {} with carets spread evenly",
            s.words, s.spread
        );
    }
}

fn field(ui: &mut Ui, text: &mut String, start: Option<usize>) -> (usize, f32, usize, bool) {
    let id = ui.scope_id().with("field");
    if let Some(at) = start {
        let mut state = TextEdit::load_state(ui.ctx(), id).unwrap_or_default();
        state.cursor.set_char_range(Some(CCursorRange::one(CCursor::new(at))));
        TextEdit::store_state(ui.ctx(), id, state);
        ui.memory_mut(|m| m.request_focus(id));
    }
    let at = |ui: &Ui| {
        TextEdit::load_state(ui.ctx(), id)
            .and_then(|s| s.cursor.char_range())
            .map_or(0, |r| r.primary.index.0)
    };
    let before = lay(ui, text, 300.0, Fit::Column);
    let swap = before.as_ref().is_some_and(|s| s.rtl_at(at(ui)));
    if swap {
        ui.input_mut(|i| {
            for e in &mut i.events {
                if let egui::Event::Key { key, .. } = e {
                    *key = match *key {
                        egui::Key::ArrowLeft => egui::Key::ArrowRight,
                        egui::Key::ArrowRight => egui::Key::ArrowLeft,
                        k => k,
                    };
                }
            }
        });
    }
    let mut last = None;
    let mut lay = |ui: &Ui, text: &dyn egui::TextBuffer, wrap: f32| {
        let s = lay(ui, text.as_str(), wrap, Fit::Column);
        let galley = s
            .as_ref()
            .map_or_else(|| raw(ui, text.as_str(), wrap), |s| Arc::clone(&s.galley));
        last = s;
        galley
    };
    ui.visuals_mut().text_cursor.stroke = Stroke::NONE;
    ui.visuals_mut().selection.bg_fill = Color32::TRANSPARENT;
    let out = TextEdit::singleline(text)
        .id(id)
        .desired_width(300.0)
        .layouter(&mut lay)
        .show(ui);
    let index = out.cursor_range.map_or(0, |r| r.primary.index.0);
    let own = last.as_ref().map_or(0.0, |s| s.caret(index));
    let pointer = ui.input(|i| i.pointer.interact_pos());
    let hit = match (&last, pointer) {
        (Some(s), Some(p)) => s.index_at(0, p.x - out.galley_pos.x),
        _ => index,
    };
    (index, own, hit, swap)
}

fn keys(ctx: &Context) {
    let mut text = String::from("שלום");
    let key = |key| egui::Event::Key {
        key,
        physical_key: None,
        pressed: true,
        repeat: false,
        modifiers: egui::Modifiers::NONE,
    };
    let steps: Vec<(&str, Option<usize>, Vec<egui::Event>)> = vec![
        ("focus, caret at 2", Some(2), vec![]),
        ("left arrow", None, vec![key(egui::Key::ArrowLeft)]),
        ("left arrow", None, vec![key(egui::Key::ArrowLeft)]),
        ("right arrow", None, vec![key(egui::Key::ArrowRight)]),
        ("type a Hebrew letter", None, vec![egui::Event::Text("א".into())]),
        ("type a Latin letter", None, vec![egui::Event::Text("a".into())]),
        ("left arrow", None, vec![key(egui::Key::ArrowLeft)]),
        ("end", None, vec![key(egui::Key::End)]),
        ("backspace", None, vec![key(egui::Key::Backspace)]),
    ];
    for (name, start, events) in steps {
        let input = RawInput {
            screen_rect: Some(Rect::from_min_size(Pos2::ZERO, Vec2::new(390.0, 100.0))),
            events,
            focused: true,
            ..RawInput::default()
        };
        let mut got = None;
        let mut full = ctx.run_ui(input, |ui| got = Some(field(ui, &mut text, start)));
        full.textures_delta.clear();
        let (index, x, _, swap) = got.unwrap();
        println!(
            "{name}: text {text:?} caret index {index} drawn at x {x:.0}{}",
            if swap { " (arrows swapped)" } else { "" }
        );
    }
    let mut text = String::from("שלום עולם");
    for x in [290.0, 270.0, 250.0] {
        let pos = Pos2::new(x, 10.0);
        let press = |pressed| egui::Event::PointerButton {
            pos,
            button: egui::PointerButton::Primary,
            pressed,
            modifiers: egui::Modifiers::NONE,
        };
        let mut got = None;
        for events in [vec![egui::Event::PointerMoved(pos), press(true)], vec![press(false)]] {
            let input = RawInput {
                screen_rect: Some(Rect::from_min_size(Pos2::ZERO, Vec2::new(390.0, 100.0))),
                events,
                focused: true,
                ..RawInput::default()
            };
            let mut full = ctx.run_ui(input, |ui| got = Some(field(ui, &mut text, None)));
            full.textures_delta.clear();
        }
        let (index, _, hit, _) = got.unwrap();
        println!("click at x {x}: egui puts the caret at index {index}, the lines say {hit}");
    }
}

fn bench(ctx: &Context) {
    let n = 2000u32;
    for (name, text, wrap) in [
        ("row title", "הזמנה 1250 נשלחה", f32::INFINITY),
        ("paragraph", PROSE, 390.0),
        ("latin title", "Order 1250 shipped", f32::INFINITY),
    ] {
        let (plain, ours) = once(ctx, |ui| {
            let _ = (raw(ui, text, wrap), lay(ui, text, wrap, Fit::Column));
            let t = std::time::Instant::now();
            for _ in 0..n {
                std::hint::black_box(raw(ui, text, wrap));
            }
            let plain = t.elapsed();
            let t = std::time::Instant::now();
            for _ in 0..n {
                std::hint::black_box(lay(ui, text, wrap, Fit::Column));
            }
            (plain, t.elapsed())
        });
        println!(
            "{name}: egui's cached layout {:.2} us, bidi with nothing kept {:.2} us",
            plain.as_secs_f64() * 1e6 / f64::from(n),
            ours.as_secs_f64() * 1e6 / f64::from(n)
        );
    }
}

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let after = |flag: &str| {
        args.windows(2)
            .filter(|w| w[0] == flag)
            .map(|w| w[1].clone())
            .collect::<Vec<_>>()
    };
    let (low, first) = (after("--font"), after("--first"));
    let ctx = ctx(&low, first.first());
    match args.first().map(String::as_str) {
        Some("probe") => probe(
            &ctx,
            if first.is_empty() {
                "the script's font is a fallback"
            } else {
                "one font has every script"
            },
        ),
        Some("shot") => shot(&ctx, args.get(1).expect(USAGE)),
        Some("caret") => caret(&ctx),
        Some("edge") => edge(&ctx),
        Some("keys") => keys(&ctx),
        Some("bench") => bench(&ctx),
        _ => eprintln!("{USAGE}"),
    }
}
