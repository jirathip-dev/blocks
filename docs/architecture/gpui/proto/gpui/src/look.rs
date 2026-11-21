use blocks::theme::{default, Mode, Tokens};
use blocks::Tone;
use gpui::Rgba;

#[derive(Clone, Copy)]
pub struct Look {
    pub bg: Rgba,
    pub card: Rgba,
    pub line: Rgba,
    pub fg: Rgba,
    pub mute: Rgba,
    pub link: Rgba,
    pub g: Rgba,
    pub a: Rgba,
    pub r: Rgba,
}

fn color(hex: &str) -> Rgba {
    let byte = |i: usize| {
        let b = hex.get(i..i + 2).and_then(|d| u8::from_str_radix(d, 16).ok());
        f32::from(b.unwrap_or(255)) / 255.0
    };
    Rgba {
        r: byte(1),
        g: byte(3),
        b: byte(5),
        a: byte(7),
    }
}

impl Look {
    pub fn new(mode: Mode) -> Self {
        let pair = default();
        let t: &Tokens = if mode == Mode::Dark {
            &pair.dark.tokens
        } else {
            &pair.light.tokens
        };
        Self {
            bg: color(t.bg.as_str()),
            card: color(t.card.as_str()),
            line: color(t.line.as_str()),
            fg: color(t.fg.as_str()),
            mute: color(t.mute.as_str()),
            link: color(t.link.as_str()),
            g: color(t.g.as_str()),
            a: color(t.a.as_str()),
            r: color(t.r.as_str()),
        }
    }

    pub fn tone(&self, tone: Option<&Tone>) -> Rgba {
        match tone {
            Some(Tone::Ok | Tone::Done) => self.g,
            Some(Tone::Warn) => self.a,
            Some(Tone::Bad | Tone::Fail) => self.r,
            Some(Tone::Mute) => self.mute,
            _ => self.fg,
        }
    }
}
