#[path = "../../shared/probe.rs"]
mod probe;
#[path = "../../shared/sample.rs"]
mod sample;
#[path = "../../shared/stats.rs"]
mod stats;
mod window;

use std::hint::black_box;
use std::time::Instant;

use blocks::theme::Mode;
use blocks::{apply, Block, Op};
use blocks_desktop::{Kit, Look, Stage};
use eframe::egui::{Context, Pos2, RawInput, Rect, ScrollArea, Vec2};

const USAGE: &str = "usage: blocks-egui dump <look|rows|scripts> | bench [--size WxH] | window <look|rows|scripts> [--size WxH] [--scheme light|dark] [--bench] [--probe] [--styled] [--face <ttf>] [--shot <png>] [--font <ttf>]...";
pub const STEP: f32 = 30.0;

pub fn screen(name: &str) -> Option<Block> {
    match name {
        "look" => Some(sample::look()),
        "rows" => Some(sample::rows(200)),
        "scripts" => Some(sample::scripts()),
        _ => None,
    }
}

pub fn kit(mode: Mode) -> Kit {
    Kit::new(Look {
        mode: Some(mode),
        ..Look::default()
    })
}

pub fn bursts() -> [(&'static str, Vec<Vec<Op>>); 2] {
    [
        ("stream-rows", sample::row_burst(120, 5)),
        ("stream-text", sample::text_burst(120)),
    ]
}

struct Head {
    ctx: Context,
    stage: Stage,
    kit: Kit,
    screen: Block,
    size: Vec2,
    frame: u32,
    offset: f32,
}

impl Head {
    fn pass(&mut self) -> f64 {
        self.frame += 1;
        let input = RawInput {
            screen_rect: Some(Rect::from_min_size(Pos2::ZERO, self.size)),
            time: Some(f64::from(self.frame) / 60.0),
            ..RawInput::default()
        };
        let clock = Instant::now();
        let out = self.ctx.run_ui(input, |ui| {
            let area = ScrollArea::vertical().vertical_scroll_offset(self.offset);
            area.show(ui, |ui| self.stage.show(ui, &self.kit, 0.0));
        });
        black_box(self.ctx.tessellate(out.shapes, out.pixels_per_point));
        clock.elapsed().as_secs_f64() * 1000.0
    }

    fn ops(&mut self, ops: &[Op]) -> f64 {
        let clock = Instant::now();
        if let Err(e) = apply(&mut self.screen, ops) {
            eprintln!("ops: {e}");
        }
        self.stage.set(Some(&self.screen));
        clock.elapsed().as_secs_f64() * 1000.0 + self.pass()
    }
}

fn bench(size: (u32, u32)) {
    let mut head = Head {
        ctx: Context::default(),
        stage: Stage::default(),
        kit: kit(Mode::Light),
        screen: sample::rows(200),
        size: Vec2::new(size.0 as f32, size.1 as f32),
        frame: 0,
        offset: 0.0,
    };
    let clock = Instant::now();
    head.stage.set(Some(&head.screen));
    head.pass();
    stats::report("egui", "first-paint", size, &[clock.elapsed().as_secs_f64() * 1000.0]);
    let still: Vec<f64> = (0..120).map(|_| head.pass()).collect();
    stats::report("egui", "repaint-still", size, &still);
    let scroll: Vec<f64> = (0..240)
        .map(|i| {
            head.offset = STEP * (if i < 120 { i } else { 240 - i }) as f32;
            head.pass()
        })
        .collect();
    stats::report("egui", "scroll", size, &scroll);
    for (name, frames) in bursts() {
        let ms: Vec<f64> = frames.iter().map(|ops| head.ops(ops)).collect();
        stats::report("egui", name, size, &ms);
    }
}

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let flag = |k: &str| {
        args.iter()
            .position(|a| a == k)
            .and_then(|i| args.get(i + 1))
            .map(String::as_str)
    };
    let name = args.get(1).map(String::as_str);
    match args.first().map(String::as_str) {
        Some("dump") => match name.and_then(screen) {
            Some(b) => println!("{}", serde_json::to_string_pretty(&b).unwrap_or_default()),
            None => eprintln!("{USAGE}"),
        },
        Some("bench") => bench(stats::size(flag("--size"))),
        Some("window") => {
            let Some(block) = name.and_then(screen) else {
                return eprintln!("{USAGE}");
            };
            let mode = if flag("--scheme") == Some("dark") {
                Mode::Dark
            } else {
                Mode::Light
            };
            let fonts = args
                .windows(2)
                .filter(|w| w[0] == "--font")
                .map(|w| w[1].clone())
                .collect();
            let run = window::Run {
                block,
                mode,
                size: stats::size(flag("--size")),
                bench: args.iter().any(|a| a == "--bench"),
                shot: flag("--shot").map(Into::into),
                fonts,
                probe: args.iter().any(|a| a == "--probe"),
                styled: args.iter().any(|a| a == "--styled"),
                face: flag("--face").map(Into::into),
            };
            if let Err(e) = window::open(run) {
                eprintln!("window: {e}");
            }
        }
        _ => eprintln!("{USAGE}"),
    }
}
