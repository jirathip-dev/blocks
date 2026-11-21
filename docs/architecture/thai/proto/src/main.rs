#[path = "../../../../../crates/blocks-desk/src/png.rs"]
mod png;
#[path = "../../../../../crates/blocks-desk/src/raster.rs"]
mod raster;
mod words;

use std::sync::Arc;

use egui::epaint::text::ByteIndex;
use egui::epaint::text::{FontData, FontInsert, FontPriority, InsertFontFamily};
use egui::text::{CCursor, CCursorRange, LayoutJob, LayoutSection};
use egui::{
    Color32, Context, Event, FontFamily, FontId, FontSelection, Galley, Key, Modifiers, Pos2, RawInput, Rect, RichText,
    TextEdit, Ui, Vec2, WidgetText,
};

use crate::words::Engine;

const LINE: &str = "ภาษาไทยไม่มีช่องว่างระหว่างคำ";
const WORDS: [&str; 8] = ["ภาษา", "ไทย", "ไม่", "มี", "ช่อง", "ว่าง", "ระหว่าง", "คำ"];
const WRAP_AT: f32 = 120.0;
const NOTE: &str = "ภาษาไทยเขียนต่อกันโดยไม่เว้นวรรคระหว่างคำซึ่งทำให้การตัดบรรทัดต้องอาศัยพจนานุกรมหรือกฎของภาษาเพื่อหาจุดที่ตัดได้อย่างถูกต้องไม่เช่นนั้นคำจะถูกตัดกลางคำและอ่านยากขึ้นมาก";
const SAMPLES: [&str; 9] = [
    LINE,
    "สั่งซื้อน้ำผึ้งป่าสองขวด",
    "กำลังจัดส่งถึงผู้รับ",
    "งานสร้างของกิ่ง main ล้มเหลวหลังจาก 12 นาที ดูบันทึก (บรรทัด 238)",
    "เด็กๆ ชอบกินขนมหวานๆมากๆเลย",
    "กรุงเทพฯเป็นเมืองหลวงของประเทศไทย",
    "ราคา ๑,๒๕๐ บาท หรือ ฿1,250",
    "คุณจิรทีปต์ส่งข้อความถึงทีมโดรเวอร์",
    "Build green on main, 12 minutes",
];
const USAGE: &str =
    "usage: thai-proto gaps | probe | seg | flow | edit [--own] | copy [--own] | same | bench | shot <png>   [--font <ttf>]... [--first <ttf>] [--lstm]";

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

fn lay(ui: &Ui, text: &str, wrap: f32, engine: Engine) -> Arc<Galley> {
    words::lay(ui, job(ui, text, wrap), engine, false)
}

fn once<R>(ctx: &Context, mut f: impl FnMut(&mut Ui) -> R) -> R {
    let mut out = None;
    let mut full = ctx.run_ui(RawInput::default(), |ui| out = Some(f(ui)));
    full.textures_delta.clear();
    out.unwrap()
}

fn lines(g: &Galley) -> Vec<String> {
    let glyphs: usize = g.rows.iter().map(|r| r.glyphs.len()).sum();
    let split = glyphs > g.job.text.chars().filter(|c| *c != '\n').count();
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
            if r.ends_with_newline {
                chars.next();
            }
            line
        })
        .collect()
}

fn on_words(lines: &[String], words: &[String]) -> bool {
    let mut ends = vec![];
    let mut at = 0;
    for w in words {
        at += w.len();
        ends.push(at);
    }
    let mut seen = 0;
    lines.iter().all(|l| {
        seen += l.len();
        ends.contains(&seen) || l.ends_with(char::is_whitespace)
    })
}

fn cut(text: &str, engine: Engine) -> Vec<String> {
    let mut out = vec![];
    let mut from = 0;
    for at in words::breaks(text, engine).into_iter().chain([text.len()]) {
        out.push(text[from..at].to_owned());
        from = at;
    }
    out
}

fn sound(text: &str, g: &Galley, own: &Galley) -> bool {
    let count = |g: &Galley| -> usize { g.rows.iter().map(|r| r.glyphs.len()).sum() };
    g.job.text == text && count(g) == count(own) && lines(g).concat() == text
}

fn probe(ctx: &Context, name: &str, engine: Engine) {
    println!("## {name}, {engine:?}");
    let spike: Vec<String> = WORDS.iter().map(|w| (*w).to_owned()).collect();
    once(ctx, |ui| {
        let own = raw(ui, LINE, WRAP_AT);
        let ours = lay(ui, LINE, WRAP_AT, engine);
        println!(
            "egui as it is, at {WRAP_AT}: {:?} on words: {}",
            lines(&own),
            on_words(&lines(&own), &spike)
        );
        println!(
            "through words,  at {WRAP_AT}: {:?} on words: {}; text and glyph count kept: {}",
            lines(&ours),
            on_words(&lines(&ours), &spike),
            sound(LINE, &ours, &own)
        );
        let n: usize = own.rows.iter().map(|r| r.glyphs.len()).sum();
        println!(
            "egui's own glyph count for the line's {} characters: {n}",
            LINE.chars().count()
        );
        let (a, b) = (raw(ui, LINE, f32::INFINITY), lay(ui, LINE, f32::INFINITY, engine));
        let at =
            |g: &Galley| -> Vec<(f32, f32)> { g.rows[0].glyphs.iter().map(|g| (g.pos.x, g.advance_width)).collect() };
        println!(
            "not wrapped: glyph places the same as egui's own: {}; size {:?} against {:?}; vertices {} against {}",
            at(&a) == at(&b),
            b.rect.size(),
            a.rect.size(),
            b.num_vertices,
            a.num_vertices
        );
        for width in [390.0, 200.0, 120.0, 60.0, 20.0] {
            for text in SAMPLES.iter().chain([&NOTE]) {
                let words = cut(text, engine);
                let (own, ours) = (raw(ui, text, width), lay(ui, text, width, engine));
                let (was, now) = (lines(&own), lines(&ours));
                let over = |g: &Galley| g.rows.iter().filter(|r| r.size.x > width + 0.01).count();
                let head: String = text.chars().take(12).collect();
                println!(
                    "{width:>5} {head:<14} rows {} -> {}; was on words {}; now on words {}; sound {}; rows over the width {} -> {}",
                    was.len(),
                    now.len(),
                    on_words(&was, &words),
                    on_words(&now, &words),
                    sound(text, &ours, &own),
                    over(&own),
                    over(&ours)
                );
            }
        }
        let latin = "Build green on main, 12 minutes";
        let (a, b) = (raw(ui, latin, 120.0), lay(ui, latin, 120.0, engine));
        println!(
            "latin: the same galley as egui's own (one Arc): {}",
            Arc::ptr_eq(&a, &b)
        );
        let cjk = "日本語のテキストは単語の間にスペースがありません";
        let (a, b) = (raw(ui, cjk, 120.0), lay(ui, cjk, 120.0, engine));
        println!("cjk: the same galley as egui's own (one Arc): {}", Arc::ptr_eq(&a, &b));
    });
}

fn between(ui: &Ui, gap: char, size: Option<f32>, cancel: bool, wrap: f32) -> LayoutJob {
    let base = job(ui, LINE, wrap);
    let format = base.sections[0].format.clone();
    let mut out = LayoutJob {
        text: String::new(),
        sections: vec![],
        ..base
    };
    let mut push = |text: &str, format: egui::TextFormat| {
        let start = out.text.len();
        out.text.push_str(text);
        let byte_range = ByteIndex(start)..ByteIndex(out.text.len());
        out.sections.push(LayoutSection {
            leading_space: 0.0,
            byte_range,
            format,
        });
    };
    for (i, w) in WORDS.iter().enumerate() {
        if i > 0 {
            let mut f = format.clone();
            if let Some(s) = size {
                f.font_id = FontId::new(s, f.font_id.family.clone());
            }
            if cancel {
                f.extra_letter_spacing = -ui.fonts_mut(|x| x.glyph_width(&f.font_id, gap));
            }
            push(&gap.to_string(), f);
        }
        push(w, format.clone());
    }
    out
}

fn gaps(ctx: &Context) {
    let inline = |ui: &Ui, gap: &str, wrap: f32| job(ui, &WORDS.join(gap), wrap);
    type Make = Box<dyn Fn(&Ui, f32) -> LayoutJob>;
    let ways: Vec<(&str, Make)> = vec![
        ("nothing (egui as it is)", Box::new(move |ui, w| inline(ui, "", w))),
        ("U+200B in the text", Box::new(move |ui, w| inline(ui, "\u{200B}", w))),
        ("\\r in the text", Box::new(move |ui, w| inline(ui, "\r", w))),
        ("U+2028 in the text", Box::new(move |ui, w| inline(ui, "\u{2028}", w))),
        ("a space in the text", Box::new(move |ui, w| inline(ui, " ", w))),
        (
            "\\r in a section of its own",
            Box::new(|ui, w| between(ui, '\r', None, false, w)),
        ),
        (
            "a space in a section of its own, size 0.001",
            Box::new(|ui, w| between(ui, ' ', Some(0.001), false, w)),
        ),
        (
            "a space in a section of its own, size 0.000001",
            Box::new(|ui, w| between(ui, ' ', Some(1e-6), false, w)),
        ),
        (
            "a space in a section of its own, letter spacing of minus its width",
            Box::new(|ui, w| between(ui, ' ', None, true, w)),
        ),
    ];
    once(ctx, |ui| {
        for (name, make) in &ways {
            let (wide, narrow) = (make(ui, f32::INFINITY), make(ui, WRAP_AT));
            let (wide, narrow) = ui.fonts_mut(|f| (f.layout_job(wide), f.layout_job(narrow)));
            let between = |c: char| c.is_whitespace() || c == '\u{200B}';
            let rows = narrow.rows.len();
            let ends = narrow
                .rows
                .iter()
                .take(rows - 1)
                .filter(|r| r.glyphs.last().is_some_and(|g| between(g.chr)))
                .count();
            let widths: Vec<f32> = narrow.rows.iter().map(|r| r.size.x).collect();
            println!(
                "{name}: not wrapped {} wide; at {WRAP_AT} {rows} rows, {ends} of {} breaks at a gap; row widths {widths:?}",
                wide.rect.width(),
                rows - 1
            );
        }
    });
}

fn seg() {
    for text in SAMPLES.iter().chain([&NOTE]) {
        let (d, l) = (cut(text, Engine::Dictionary), cut(text, Engine::Lstm));
        println!("dictionary: {}", d.join("|"));
        println!(
            "lstm:       {}{}",
            l.join("|"),
            if d == l { "" } else { "   <- differs" }
        );
    }
}

fn flow(ctx: &Context, engine: Engine) {
    let rows = |ui: &mut Ui, ours: bool| -> Vec<(f32, f32, f32)> {
        let mut out = vec![];
        ui.allocate_ui(Vec2::new(WRAP_AT, 300.0), |ui| {
            ui.set_width(WRAP_AT);
            let top = ui.cursor().top();
            ui.horizontal_wrapped(|ui| {
                ui.spacing_mut().item_spacing.x = 0.0;
                let lead = ui.label("Status: ");
                out.push((lead.rect.left(), lead.rect.right(), lead.rect.top() - top));
                let r = if ours {
                    words::label(ui, LINE, None, engine, true)
                } else {
                    ui.label(LINE)
                };
                out.push((r.rect.left(), r.rect.right(), r.rect.height()));
                let tail = ui.label(" ok");
                out.push((tail.rect.left(), tail.rect.right(), tail.rect.top() - top));
            });
        });
        out
    };
    let (own, ours) = once(ctx, |ui| (rows(ui, false), rows(ui, true)));
    println!("a wrapping row 120 wide: `Status: `, the probe line, ` ok` (left, right, top or height)");
    println!("egui's own label: {own:?}");
    println!("words::label:     {ours:?}");
    let galleys = once(ctx, |ui| {
        let mut made = vec![];
        ui.allocate_ui(Vec2::new(WRAP_AT, 300.0), |ui| {
            ui.set_width(WRAP_AT);
            ui.horizontal_wrapped(|ui| {
                ui.spacing_mut().item_spacing.x = 0.0;
                ui.label("Status: ");
                let job = WidgetText::from(LINE).into_layout_job(ui.style(), FontSelection::Default, ui.text_valign());
                let soft = words::Soft::of(&job, engine).unwrap();
                let (_, laid, _) = egui::Label::new(soft.job.clone()).layout_in_ui(ui);
                let hard = soft.harden(&laid).unwrap();
                made.push((
                    lines(&hard),
                    hard.rows.iter().map(|r| (r.pos.x, r.size.x)).collect::<Vec<_>>(),
                ));
            });
        });
        made
    });
    println!("its rows after `Status: ` (text; x and width of each): {galleys:?}");
}

fn edit(ctx: &Context, engine: Engine, own: bool) {
    let mut text = String::new();
    let id = egui::Id::unique("edit");
    let pass = |events: Vec<Event>, text: &mut String| {
        let input = RawInput {
            screen_rect: Some(Rect::from_min_size(Pos2::ZERO, Vec2::new(400.0, 300.0))),
            events,
            focused: true,
            ..RawInput::default()
        };
        let mut out = None;
        let mut full = ctx.run_ui(input, |ui| {
            let mut layouter = |ui: &Ui, buf: &dyn egui::TextBuffer, width: f32| {
                let font = egui::TextStyle::Body.resolve(ui.style());
                let job = LayoutJob::simple(buf.as_str().to_owned(), font, Color32::BLACK, width);
                if own {
                    ui.fonts_mut(|f| f.layout_job(job))
                } else {
                    words::lay(ui, job, engine, true)
                }
            };
            let o = TextEdit::multiline(text)
                .id(id)
                .desired_width(WRAP_AT)
                .layouter(&mut layouter)
                .show(ui);
            o.response.request_focus();
            let index = o.cursor_range.map(|r| r.primary.index);
            let caret = index.map(|i| o.galley.pos_from_cursor(CCursor::new(i)).min);
            out = Some((lines(&o.galley), index, caret));
        });
        full.textures_delta.clear();
        out.unwrap()
    };
    let key = |key: Key| Event::Key {
        key,
        physical_key: None,
        pressed: true,
        repeat: false,
        modifiers: Modifiers::NONE,
    };
    pass(vec![], &mut text);
    let steps: Vec<(&str, Vec<Event>)> = vec![
        ("type the probe line", vec![Event::Text(LINE.into())]),
        ("settle", vec![]),
        ("up", vec![key(Key::ArrowUp)]),
        ("home", vec![key(Key::Home)]),
        ("right", vec![key(Key::ArrowRight)]),
        ("down", vec![key(Key::ArrowDown)]),
        ("end", vec![key(Key::End)]),
        ("type ครับ", vec![Event::Text("ครับ".into())]),
        ("backspace", vec![key(Key::Backspace)]),
    ];
    for (name, events) in steps {
        let (rows, index, caret) = pass(events, &mut text);
        println!("{name:<20} rows {rows:?} caret index {index:?} at {caret:?}");
    }
    let _ = CCursorRange::default();
}

fn copy(ctx: &Context, engine: Engine, own: bool) {
    let pass = |events: Vec<Event>| {
        let input = RawInput {
            screen_rect: Some(Rect::from_min_size(Pos2::ZERO, Vec2::new(400.0, 300.0))),
            events,
            focused: true,
            ..RawInput::default()
        };
        let mut rect = Rect::NOTHING;
        let mut full = ctx.run_ui(input, |ui| {
            ui.set_width(WRAP_AT);
            rect = if own {
                ui.label(LINE).rect
            } else {
                words::label(ui, LINE, None, engine, true).rect
            };
        });
        full.textures_delta.clear();
        (rect, full.platform_output.commands)
    };
    let button = |pos: Pos2, pressed: bool| Event::PointerButton {
        pos,
        button: egui::PointerButton::Primary,
        pressed,
        modifiers: Modifiers::NONE,
    };
    let (rect, _) = pass(vec![]);
    let (from, to) = (
        rect.left_top() + Vec2::new(1.0, 4.0),
        rect.right_bottom() - Vec2::new(0.0, 4.0),
    );
    let to = Pos2::new(to.x + 40.0, to.y);
    pass(vec![Event::PointerMoved(from)]);
    pass(vec![button(from, true)]);
    pass(vec![Event::PointerMoved(to)]);
    pass(vec![button(to, false)]);
    let (_, commands) = pass(vec![Event::Copy]);
    let copied = commands.iter().find_map(|c| match c {
        egui::OutputCommand::CopyText(t) => Some(t.clone()),
        _ => None,
    });
    println!(
        "a drag over both rows of the line in a label 120 wide, then copy ({}): {copied:?}; the line itself: {}",
        if own { "egui's own label" } else { "words::label" },
        copied.as_deref() == Some(LINE)
    );
}

fn column(ui: &mut Ui, engine: Engine) {
    let head = |ui: &mut Ui, s: &str| {
        ui.add_space(6.0);
        ui.label(RichText::new(s).small().color(Color32::from_gray(110)));
    };
    let black = |s: &str| RichText::new(s).color(Color32::BLACK);
    head(ui, "egui 0.37 as it is");
    ui.label(black(NOTE));
    head(ui, "the same text, breaks from the dictionary");
    words::label(ui, black(NOTE), None, engine, true);
    head(ui, "the probe line at 120 points: as it is, then with breaks");
    ui.horizontal_top(|ui| {
        for ours in [false, true] {
            ui.vertical(|ui| {
                ui.set_width(WRAP_AT);
                if ours {
                    words::label(ui, black(LINE), None, engine, true);
                } else {
                    ui.label(black(LINE));
                }
            });
            ui.add_space(24.0);
        }
    });
    head(ui, "a wrapping row: a Latin label, a Thai one, a Latin one");
    ui.horizontal_wrapped(|ui| {
        ui.spacing_mut().item_spacing.x = 0.0;
        ui.label(black("Deploy 4821: "));
        words::label(
            ui,
            black("กำลังจัดส่งถึงผู้รับและรอการยืนยันจากลูกค้าภายในวันนี้ก่อนเวลาหกโมงเย็น").strong(),
            None,
            engine,
            true,
        );
        ui.label(black(" (12 min)"));
    });
    head(ui, "a word longer than its line still breaks inside itself (60 points)");
    ui.vertical(|ui| {
        ui.set_width(60.0);
        words::label(ui, black("ประชาธิปไตยและรัฐธรรมนูญ"), None, engine, true);
    });
}

fn draw(ctx: &Context, w: u16, h: u16, mut add: impl FnMut(&mut Ui)) -> Vec<u8> {
    let mut textures = raster::Textures::default();
    let mut canvas = raster::Canvas::new(w, h);
    for _ in 0..2 {
        let input = RawInput {
            screen_rect: Some(Rect::from_min_size(Pos2::ZERO, Vec2::new(f32::from(w), f32::from(h)))),
            ..RawInput::default()
        };
        let mut full = ctx.run_ui(input, |ui| {
            ui.painter().rect_filled(ui.max_rect(), 0.0, Color32::from_gray(246));
            egui::Frame::new().inner_margin(12.0).show(ui, |ui| add(ui));
        });
        textures.update(&full.textures_delta);
        let prims = ctx.tessellate(full.shapes, full.pixels_per_point);
        canvas.paint(&prims, &textures);
        textures.free(&full.textures_delta);
        full.textures_delta.clear();
    }
    canvas.png()
}

fn shot(ctx: &Context, path: &str, engine: Engine) {
    std::fs::write(path, draw(ctx, 390, 400, |ui| column(ui, engine))).unwrap();
    println!("wrote {path}");
}

fn same(fresh: &dyn Fn() -> Context, engine: Engine) {
    let texts = [SAMPLES[0], SAMPLES[1], SAMPLES[2], SAMPLES[5], SAMPLES[6], SAMPLES[8]];
    let page = |ours: bool| {
        draw(&fresh(), 1440, 200, |ui| {
            for t in texts {
                if ours {
                    words::label(ui, t, None, engine, true);
                } else {
                    ui.label(t);
                }
            }
        })
    };
    let (own, ours) = (page(false), page(true));
    println!(
        "six texts that fit their row at 1440, egui's own labels against words::label: PNG bytes the same: {}",
        own == ours
    );
    let styles: [(&str, fn(RichText) -> RichText); 5] = [
        ("strong", |t| t.strong()),
        ("italics", |t| t.italics()),
        ("underline", |t| t.underline()),
        ("code (a background)", |t| t.code()),
        ("strikethrough", |t| t.strikethrough()),
    ];
    for (name, style) in styles {
        let page = |ours: bool| {
            draw(&fresh(), 1440, 60, |ui| {
                let t = style(RichText::new(SAMPLES[1]));
                if ours {
                    words::label(ui, t, None, engine, true);
                } else {
                    ui.label(t);
                }
            })
        };
        println!("{name}: PNG bytes the same: {}", page(false) == page(true));
        let differ = page(false)
            .iter()
            .zip(page(true).iter())
            .filter(|(a, b)| a != b)
            .count();
        if differ > 0 {
            println!("  bytes that differ in the stored PNG (4 a pixel): {differ}");
            let both = draw(&fresh(), 390, 60, |ui| {
                ui.label(style(RichText::new(SAMPLES[1]).color(Color32::BLACK)));
                words::label(
                    ui,
                    style(RichText::new(SAMPLES[1]).color(Color32::BLACK)),
                    None,
                    engine,
                    true,
                );
            });
            std::fs::write(format!("out/{name}.png"), both).unwrap();
        }
    }
}

fn bench(ctx: &Context, fresh: &dyn Fn() -> Context) {
    let n = 2000u32;
    let per = |d: std::time::Duration| d.as_secs_f64() * 1e6 / f64::from(n);
    for (name, text, wrap) in [
        ("row title", SAMPLES[1], 390.0),
        ("paragraph, 165 characters", NOTE, 390.0),
        ("latin title", "Order 1250 shipped", 390.0),
    ] {
        for engine in [Engine::Dictionary, Engine::Lstm] {
            let t = std::time::Instant::now();
            for _ in 0..n {
                std::hint::black_box(words::breaks(std::hint::black_box(text), engine));
            }
            let cut = t.elapsed();
            let (plain, soft, ours) = once(ctx, |ui| {
                let _ = (raw(ui, text, wrap), lay(ui, text, wrap, engine));
                let t = std::time::Instant::now();
                for _ in 0..n {
                    std::hint::black_box(raw(ui, text, wrap));
                }
                let plain = t.elapsed();
                let made = words::Soft::of(&job(ui, text, wrap), engine);
                let t = std::time::Instant::now();
                for _ in 0..n {
                    if let Some(s) = &made {
                        let laid = ui.fonts_mut(|f| f.layout_job(s.job.clone()));
                        std::hint::black_box(s.harden(&laid));
                    }
                }
                let soft = t.elapsed();
                let t = std::time::Instant::now();
                for _ in 0..n {
                    std::hint::black_box(lay(ui, text, wrap, engine));
                }
                (plain, soft, t.elapsed())
            });
            println!(
                "{name}, {engine:?}: breaks {:.2} us; egui's cached layout {:.2} us; cached soft layout and harden {:.2} us; all of it, nothing kept {:.2} us",
                per(cut),
                per(plain),
                per(soft),
                per(ours)
            );
        }
    }
    let engine = Engine::Dictionary;
    let titles: Vec<String> = (0..200).map(|i| format!("{} {i}", SAMPLES[1])).collect();
    let screen = |ui: &mut Ui, way: u8| {
        ui.set_width(390.0);
        for t in &titles {
            match way {
                0 => ui.label(t),
                1 => words::label(ui, t, None, engine, false),
                _ => words::label(ui, t, None, engine, true),
            };
            match way {
                0 => ui.label(NOTE),
                1 => words::label(ui, NOTE, None, engine, false),
                _ => words::label(ui, NOTE, None, engine, true),
            };
        }
    };
    for (way, name) in [(0, "egui's own labels"), (1, "words, nothing kept"), (2, "words, kept")] {
        let ctx = fresh();
        let mut times = vec![];
        for _ in 0..60 {
            let t = std::time::Instant::now();
            let mut full = ctx.run_ui(RawInput::default(), |ui| screen(ui, way));
            times.push(t.elapsed());
            full.textures_delta.clear();
        }
        let first = times[0];
        times.drain(..10);
        times.sort();
        println!(
            "a pass of 200 Thai titles and 200 Thai paragraphs, {name}: first {first:.2?}, then median {:.2?}, slowest {:.2?}",
            times[times.len() / 2],
            times[times.len() - 1]
        );
    }
    let long = NOTE.repeat(6);
    let cuts = words::breaks(&long, engine);
    for (way, name) in [(0, "egui's own label"), (2, "words, kept")] {
        let ctx = fresh();
        let mut times = vec![];
        for end in cuts.iter().skip(cuts.len() - 130) {
            let text = &long[..*end];
            let t = std::time::Instant::now();
            let mut full = ctx.run_ui(RawInput::default(), |ui| {
                ui.set_width(390.0);
                match way {
                    0 => ui.label(text),
                    _ => words::label(ui, text, None, engine, true),
                };
            });
            times.push(t.elapsed());
            full.textures_delta.clear();
        }
        times.drain(..10);
        times.sort();
        println!(
            "a paragraph of about {} characters that grows by a word a pass, {name}: median {:.2?}, slowest {:.2?}",
            long.chars().count(),
            times[times.len() / 2],
            times[times.len() - 1]
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
    let engine = if args.iter().any(|a| a == "--lstm") {
        Engine::Lstm
    } else {
        Engine::Dictionary
    };
    let ctx = ctx(&low, first.first());
    let name = match (low.is_empty(), first.is_empty()) {
        (_, false) => "the Thai font is first",
        (false, true) => "the Thai font is a fallback",
        (true, true) => "no Thai font",
    };
    match args.first().map(String::as_str) {
        Some("probe") => probe(&ctx, name, engine),
        Some("gaps") => gaps(&ctx),
        Some("seg") => seg(),
        Some("copy") => copy(&ctx, engine, args.iter().any(|a| a == "--own")),
        Some("flow") => flow(&ctx, engine),
        Some("edit") => edit(&ctx, engine, args.iter().any(|a| a == "--own")),
        Some("same") => same(&|| self::ctx(&low, first.first()), engine),
        Some("bench") => bench(&ctx, &|| self::ctx(&low, first.first())),
        Some("shot") => shot(&ctx, args.get(1).expect(USAGE), engine),
        _ => eprintln!("{USAGE}"),
    }
}
