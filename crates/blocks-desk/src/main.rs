use std::collections::BTreeMap;
use std::path::Path;

use blocks::theme::Mode;
use blocks::tree::{Shot, Step};
use blocks_desk::{Desk, Echo, Want, ECHO};
use blocks_desktop::{Kit, Look};
use serde::de::DeserializeOwned;
use serde::Serialize;

const USAGE: &str = "usage: blocks-desk --screen <file> [--size 390x844] [--scheme light|dark] [--script <steps.json>] [--expect <tree.json>] [--ids <ids.json>] [--font <ttf>]... [--check] --out <dir>";
const KEYS: [&str; 7] = ["screen", "size", "scheme", "script", "expect", "ids", "out"];

struct Failed(String);

impl std::fmt::Debug for Failed {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}

fn main() -> Result<(), Failed> {
    let faults = run(std::env::args().skip(1)).map_err(|e| Failed(format!("blocks-desk: {e}")))?;
    if faults.is_empty() {
        return Ok(());
    }
    Err(Failed(faults.join("\n")))
}

fn read<T: DeserializeOwned>(path: &str) -> Result<T, String> {
    let text = std::fs::read_to_string(path).map_err(|e| format!("{path}: {e}"))?;
    serde_json::from_str(&text).map_err(|e| format!("{path}: {e}"))
}

fn write(dir: &Path, file: &str, v: &impl Serialize) -> Result<(), String> {
    let path = dir.join(file);
    let text = serde_json::to_string_pretty(v).map_err(|e| e.to_string())? + "\n";
    std::fs::write(&path, text).map_err(|e| format!("{}: {e}", path.display()))
}

fn run(mut args: impl Iterator<Item = String>) -> Result<Vec<String>, String> {
    let mut opts = BTreeMap::new();
    let mut check = false;
    let mut fonts = vec![];
    while let Some(a) = args.next() {
        if a == "--check" {
            check = true;
            continue;
        }
        if a == "--font" {
            fonts.push(args.next().ok_or(USAGE)?);
            continue;
        }
        let key = a.strip_prefix("--").filter(|k| KEYS.contains(k)).ok_or(USAGE)?;
        opts.insert(key.to_owned(), args.next().ok_or(USAGE)?);
    }
    let opt = |k: &str| opts.get(k).map(String::as_str);
    let (Some(screen), Some(out)) = (opt("screen"), opt("out")) else {
        return Err(USAGE.into());
    };
    let (width, height) = opt("size")
        .unwrap_or("390x844")
        .split_once('x')
        .and_then(|(w, h)| Some((w.parse().ok()?, h.parse().ok()?)))
        .ok_or(USAGE)?;
    let mode = match opt("scheme") {
        None | Some("light") => Mode::Light,
        Some("dark") => Mode::Dark,
        Some(s) => return Err(format!("no scheme {s}")),
    };
    let mut steps: Vec<Step> = opt("script").map(read).transpose()?.unwrap_or_default();
    if !steps.iter().any(|s| matches!(s, Step::Shot(_))) {
        let stem = Path::new(screen).file_stem().map(|s| s.to_string_lossy().into_owned());
        let name = stem.unwrap_or_else(|| "shot".into());
        steps.push(Step::Shot(Shot { name }));
    }
    let look = Look {
        mode: Some(mode),
        still: true,
        ..Look::default()
    };
    let want = Want {
        tree: opt("expect").map(read).transpose()?,
        ids: opt("ids").map(read).transpose()?,
    };
    let mut desk = Desk::new(read(screen)?)
        .size(width, height)
        .kit(Kit::new(look).island(ECHO, || Box::new(Echo)));
    for f in &fonts {
        desk = desk.font(std::fs::read(f).map_err(|e| format!("{f}: {e}"))?);
    }
    let mut run = desk.run(&steps);
    if check {
        run.check(&want);
    }
    let dir = Path::new(out);
    std::fs::create_dir_all(dir).map_err(|e| format!("{out}: {e}"))?;
    for s in &run.shots {
        let png = dir.join(format!("{}.png", s.name));
        std::fs::write(&png, &s.png).map_err(|e| format!("{}: {e}", png.display()))?;
        write(dir, &format!("{}.tree.json", s.name), &s.tree)?;
    }
    write(dir, "report.json", &run.report)?;
    Ok(run.faults)
}
