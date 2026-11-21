use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;

use blocks::theme::Mode;
use blocks::{apply, Block, Op};
use blocks_desktop::{Kit, Stage};
use eframe::egui::epaint::text::{FontInsert, FontPriority, InsertFontFamily};
use eframe::egui::{self, Color32, ColorImage, FontData, FontFamily, FontId, ScrollArea, TextStyle, ViewportCommand};

use crate::{bursts, kit, probe, stats, STEP};

const WARM: usize = 30;
const SCROLL: usize = 240;

pub struct Run {
    pub block: Block,
    pub mode: Mode,
    pub size: (u32, u32),
    pub bench: bool,
    pub shot: Option<PathBuf>,
    pub fonts: Vec<String>,
    pub probe: bool,
    pub styled: bool,
    pub face: Option<String>,
}

struct Win {
    stage: Stage,
    kit: Kit,
    run: Run,
    frame: usize,
    last: Option<Instant>,
    gaps: Vec<f64>,
    cpu: Vec<f64>,
    plan: Vec<(&'static str, usize)>,
    ops: Vec<Vec<Op>>,
    saved: Arc<AtomicBool>,
}

fn save(path: &PathBuf, image: &ColorImage) -> Result<(), String> {
    let file = std::fs::File::create(path).map_err(|e| e.to_string())?;
    let (w, h) = (image.size[0] as u32, image.size[1] as u32);
    let mut enc = png::Encoder::new(std::io::BufWriter::new(file), w, h);
    enc.set_color(png::ColorType::Rgba);
    enc.set_depth(png::BitDepth::Eight);
    let mut out = enc.write_header().map_err(|e| e.to_string())?;
    out.write_image_data(image.as_raw()).map_err(|e| e.to_string())
}

impl Win {
    fn step(&mut self) -> f32 {
        let at = self.frame.saturating_sub(WARM);
        if at < SCROLL {
            return STEP * (if at < SCROLL / 2 { at } else { SCROLL - at }) as f32;
        }
        if let Some(ops) = self.ops.get(at - SCROLL) {
            if let Err(e) = apply(&mut self.run.block, ops) {
                eprintln!("ops: {e}");
            }
            self.stage.set(Some(&self.run.block));
        }
        0.0
    }

    fn done(&mut self, ctx: &egui::Context) {
        let mut from = WARM;
        for (name, frames) in &self.plan {
            let to = (from + frames).min(self.gaps.len());
            stats::report("egui-window-gap", name, self.run.size, &self.gaps[from.min(to)..to]);
            stats::report("egui-window-cpu", name, self.run.size, &self.cpu[from.min(to)..to]);
            from = to;
        }
        ctx.send_viewport_cmd(ViewportCommand::Close);
    }
}

fn probe(ui: &egui::Ui) {
    let font = FontId::proportional(14.0);
    let flat = |s: &str| ui.painter().layout_no_wrap(s.to_owned(), font.clone(), Color32::BLACK);
    let xs = |s: &str| {
        let g = flat(s);
        let glyphs: Vec<_> = g
            .rows
            .iter()
            .flat_map(|r| r.row.glyphs.iter().map(move |x| (x.chr, r.pos.x + x.pos.x)))
            .collect();
        s.chars()
            .filter(|c| !c.is_whitespace())
            .filter_map(|c| glyphs.iter().find(|(g, _)| *g == c).map(|(_, x)| *x))
            .collect::<Vec<f32>>()
    };
    let wrapped = ui.painter().layout(
        probe::THAI_LINE.to_owned(),
        font.clone(),
        Color32::BLACK,
        probe::WRAP_AT,
    );
    let lines: Vec<String> = wrapped
        .rows
        .iter()
        .map(|r| r.row.glyphs.iter().map(|g| g.chr).collect())
        .collect();
    probe::report(
        "egui",
        &xs(probe::HEBREW),
        &xs(probe::ARABIC),
        flat(probe::THAI_BASE).size().x,
        flat(probe::THAI_MARKED).size().x,
        &lines,
    );
}

impl eframe::App for Win {
    fn ui(&mut self, ui: &mut egui::Ui, frame: &mut eframe::Frame) {
        if self.run.probe {
            if self.frame == 3 {
                probe(ui);
                ui.ctx().send_viewport_cmd(ViewportCommand::Close);
            }
            ui.ctx().request_repaint();
        }
        let now = Instant::now();
        let gap = self.last.replace(now).map_or(0.0, |l| (now - l).as_secs_f64() * 1000.0);
        self.gaps.push(gap);
        self.cpu.push(f64::from(frame.info().cpu_usage.unwrap_or(0.0)) * 1000.0);
        let mut area = ScrollArea::vertical();
        if self.run.bench && self.frame >= WARM {
            area = area.vertical_scroll_offset(self.step());
        }
        let margin = if self.run.styled { 16 } else { 0 };
        let pair = blocks::theme::default();
        let dark = self.run.mode == Mode::Dark;
        let bg = if dark {
            pair.dark.tokens.bg.as_str()
        } else {
            pair.light.tokens.bg.as_str()
        };
        let fill = Color32::from_hex(bg.get(..7).unwrap_or("#000000")).unwrap_or(Color32::BLACK);
        egui::Frame::new().fill(fill).inner_margin(margin).show(ui, |ui| {
            ui.set_min_size(ui.available_size());
            area.show(ui, |ui| self.stage.show(ui, &self.kit, 0.0));
        });
        self.frame += 1;
        let ctx = ui.ctx().clone();
        if self.run.bench {
            ctx.request_repaint();
            let all: usize = self.plan.iter().map(|(_, n)| n).sum();
            if self.frame == WARM + all {
                self.done(&ctx);
            }
        }
        if let Some(path) = self.run.shot.clone() {
            ctx.request_repaint();
            if self.frame == 10 {
                let saved = self.saved.clone();
                ctx.request_screenshot(move |image| {
                    if let Err(e) = save(&path, &image) {
                        eprintln!("shot: {e}");
                    }
                    saved.store(true, Ordering::Relaxed);
                });
            }
            if self.saved.load(Ordering::Relaxed) {
                ctx.send_viewport_cmd(ViewportCommand::Close);
            }
        }
    }
}

pub fn open(run: Run) -> eframe::Result {
    let (w, h) = run.size;
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default().with_inner_size([w as f32, h as f32]),
        ..Default::default()
    };
    let bursts = bursts();
    let mut plan = vec![("scroll", SCROLL)];
    plan.extend(bursts.iter().map(|(n, f)| (*n, f.len())));
    let ops = bursts.into_iter().flat_map(|(_, f)| f).collect();
    eframe::run_native(
        "blocks-egui",
        options,
        Box::new(move |cc| {
            cc.egui_ctx.set_theme(if run.mode == Mode::Dark {
                egui::Theme::Dark
            } else {
                egui::Theme::Light
            });
            for (i, f) in run.fonts.iter().enumerate() {
                let data = std::fs::read(f)?;
                let families = [FontFamily::Proportional, FontFamily::Monospace].map(|family| InsertFontFamily {
                    family,
                    priority: FontPriority::Lowest,
                });
                cc.egui_ctx.add_font(FontInsert::new(
                    &format!("extra{i}"),
                    FontData::from_owned(data),
                    families.into(),
                ));
            }
            if let Some(f) = &run.face {
                let first = [FontFamily::Proportional].map(|family| InsertFontFamily {
                    family,
                    priority: FontPriority::Highest,
                });
                let data = FontData::from_owned(std::fs::read(f)?);
                cc.egui_ctx.add_font(FontInsert::new("face", data, first.into()));
            }
            if run.styled {
                cc.egui_ctx.global_style_mut(|s| {
                    s.spacing.item_spacing = egui::vec2(8.0, 8.0);
                    for (style, font) in &mut s.text_styles {
                        font.size = match style {
                            TextStyle::Heading => 22.0,
                            TextStyle::Small => 12.0,
                            TextStyle::Monospace => 13.0,
                            _ => 14.0,
                        };
                    }
                });
            }
            let mut stage = Stage::default();
            stage.set(Some(&run.block));
            Ok(Box::new(Win {
                stage,
                kit: kit(run.mode),
                run,
                frame: 0,
                last: None,
                gaps: vec![],
                cpu: vec![],
                plan,
                ops,
                saved: Arc::new(AtomicBool::new(false)),
            }))
        }),
    )
}
