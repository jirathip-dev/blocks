use blocks::theme::Theme;
use blocks::{Figure, Tone};
use egui::Ui;

use crate::words;

/// The `Theme` port: a figure's art and a pack's words.
pub trait Art {
    fn figure(&self, f: &Figure, ui: &mut Ui) -> bool;
    fn word(&self, key: &str) -> Option<&str>;
}

/// No art: each state's glyph, the plain words.
#[derive(Clone, Copy, Debug, Default)]
pub struct Plain;

/// A pack's words; its sprites wait for an SVG reader.
#[derive(Clone, Debug)]
pub struct Pack(pub Theme);

fn glyph(t: &Tone) -> Option<(&'static str, &'static str)> {
    Some(match t {
        Tone::Working => ("●", "working"),
        Tone::Needs => ("!", "needs you"),
        Tone::Fail => ("✗", "failed"),
        Tone::Done => ("✓", "done"),
        Tone::Idle => ("○", "idle"),
        Tone::Other(s) if s == "merged" => ("✓", "merged"),
        _ => return None,
    })
}

impl Art for Plain {
    fn figure(&self, f: &Figure, ui: &mut Ui) -> bool {
        let Some((g, word)) = f.state.as_ref().and_then(glyph) else {
            return false;
        };
        words::label(ui, g).on_hover_text(word);
        true
    }

    fn word(&self, _key: &str) -> Option<&str> {
        None
    }
}

impl Art for Pack {
    fn figure(&self, f: &Figure, ui: &mut Ui) -> bool {
        Plain.figure(f, ui)
    }

    fn word(&self, key: &str) -> Option<&str> {
        self.0.words.get(key).map(String::as_str).filter(|w| !w.is_empty())
    }
}
