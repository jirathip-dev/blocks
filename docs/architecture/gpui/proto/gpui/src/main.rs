mod bench;
mod draw;
mod field;
mod look;
#[path = "../../shared/probe.rs"]
mod probe;
#[path = "../../shared/sample.rs"]
mod sample;
mod shot;
mod stage;
#[path = "../../shared/stats.rs"]
mod stats;
mod text;
mod window;

use blocks::theme::Mode;
use blocks::{Block, Op};

const USAGE: &str = "usage: blocks-gpui shot <look|rows|scripts> [--size WxH] [--scheme light|dark] [--scale 1|2] [--window] --out <png> | bench [--size WxH] [--gpu] | probe | repack <png> | window <look|rows|scripts> [--size WxH] [--scheme light|dark] [--bench]";
pub const STEP: f32 = 30.0;

pub fn screen(name: &str) -> Option<Block> {
    match name {
        "look" => Some(sample::look()),
        "rows" => Some(sample::rows(200)),
        "scripts" => Some(sample::scripts()),
        _ => None,
    }
}

pub fn bursts() -> [(&'static str, Vec<Vec<Op>>); 2] {
    [
        ("stream-rows", sample::row_burst(120, 5)),
        ("stream-text", sample::text_burst(120)),
    ]
}

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let flag = |k: &str| {
        args.iter()
            .position(|a| a == k)
            .and_then(|i| args.get(i + 1))
            .map(String::as_str)
    };
    let has = |k: &str| args.iter().any(|a| a == k);
    let size = stats::size(flag("--size"));
    let mode = if flag("--scheme") == Some("dark") {
        Mode::Dark
    } else {
        Mode::Light
    };
    let block = args.get(1).and_then(|n| screen(n));
    let done = match (args.first().map(String::as_str), block) {
        (Some("bench"), _) => bench::run(size, has("--gpu")),
        (Some("probe"), _) => shot::probe(),
        (Some("repack"), _) => args.get(1).map_or(Err(USAGE.into()), |p| shot::repack(p)),
        (Some("shot"), Some(block)) => {
            let scale = flag("--scale").and_then(|s| s.parse().ok()).unwrap_or(1.0);
            let Some(out) = flag("--out") else {
                return eprintln!("{USAGE}");
            };
            if has("--window") {
                shot::window(block, mode, size, out.into())
            } else {
                shot::headless(block, mode, size, scale, out)
            }
        }
        (Some("window"), Some(block)) => window::open(block, mode, size, has("--bench")),
        _ => Err(USAGE.into()),
    };
    if let Err(e) = done {
        eprintln!("blocks-gpui: {e}");
        std::process::exit(1);
    }
}
