use serde::{Deserialize, Serialize};

use super::{gate, schemes, Mode, PerMode};

/// A pack's theme.json: its label, default schemes, art flags and words.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Theme {
    pub label: String,
    pub scheme: PerMode<String>,
    pub sprites: bool,
    pub moments: bool,
    pub words: std::collections::BTreeMap<String, String>,
}

/// A vendored swag pack: its name and its files, compiled in.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Pack {
    pub name: &'static str,
    pub files: &'static [(&'static str, &'static [u8])],
}

macro_rules! pack {
    ($name:literal) => {
        Pack {
            name: $name,
            files: &[
                pack!(@file $name, "theme.json"),
                pack!(@file $name, "sprites.svg"),
                pack!(@file $name, "scene.svg"),
                pack!(@file $name, "icon.png"),
            ],
        }
    };
    (@file $name:literal, $file:literal) => {
        ($file, include_bytes!(concat!("../../../../theme/packs/", $name, "/", $file)))
    };
}

/// swag's packs at the commit theme/packs/SOURCE names.
pub fn packs() -> &'static [Pack] {
    const PACKS: [Pack; 3] = [pack!("farm"), pack!("garden"), pack!("kitchen")];
    &PACKS
}

const WORDS: [&str; 8] = [
    "done",
    "empty-threads",
    "fail",
    "idle",
    "loading",
    "merged",
    "needs",
    "working",
];

const MAX_SVG: usize = 256 * 1024;

fn scheme_misses(slot: &str, name: &str, mode: Mode) -> Vec<String> {
    match schemes().iter().find(|(n, _)| *n == name) {
        None => vec![format!("scheme.{slot}: {name:?} is no built-in scheme")],
        Some((_, s)) if s.mode != mode => vec![format!("scheme.{slot}: {name:?} is not a {slot} scheme")],
        Some((_, s)) => gate(s)
            .into_iter()
            .map(|m| format!("scheme.{slot}: {name:?} fails {}: {:.2} < {}", m.what, m.got, m.min))
            .collect(),
    }
}

fn file_misses(name: &str, bytes: &[u8]) -> Option<String> {
    if name == "icon.png" {
        let png = bytes.starts_with(b"\x89PNG\r\n\x1a\n");
        let size = bytes.get(16..24) == Some([0, 0, 0, 192, 0, 0, 0, 192].as_slice());
        return (!(png && size)).then(|| "icon.png: not a 192×192 PNG".to_owned());
    }
    if bytes.len() > MAX_SVG {
        return Some(format!("{name}: {} bytes, over {MAX_SVG}", bytes.len()));
    }
    (!bytes.starts_with(b"<svg")).then(|| format!("{name}: not an SVG"))
}

/// The pack gate: its files, sizes, words and schemes; the misses, empty when it passes.
pub fn check_pack(files: &[(&str, &[u8])]) -> Vec<String> {
    let mut misses = Vec::new();
    for name in ["theme.json", "sprites.svg", "scene.svg", "icon.png"] {
        match files.iter().find(|(n, _)| *n == name) {
            None => misses.push(format!("lacks {name}")),
            Some((_, bytes)) if name != "theme.json" => misses.extend(file_misses(name, bytes)),
            Some(_) => {}
        }
    }
    let Some((_, json)) = files.iter().find(|(n, _)| *n == "theme.json") else {
        return misses;
    };
    let theme: Theme = match serde_json::from_slice(json) {
        Ok(t) => t,
        Err(e) => {
            misses.push(format!("theme.json: {e}"));
            return misses;
        }
    };
    for w in WORDS.iter().filter(|w| !theme.words.contains_key(**w)) {
        misses.push(format!("words: lacks {w:?}"));
    }
    for (k, v) in &theme.words {
        if !WORDS.contains(&k.as_str()) {
            misses.push(format!("words: {k:?} is no word a renderer shows"));
        } else if v.trim().is_empty() || v.chars().count() > 24 {
            misses.push(format!("words.{k}: {v:?} is empty or over 24 characters"));
        }
    }
    misses.extend(scheme_misses("dark", &theme.scheme.dark, Mode::Dark));
    misses.extend(scheme_misses("light", &theme.scheme.light, Mode::Light));
    misses
}
