use blocks::theme::{default, LabelCase, LabelRole, Mode, PerMode, Scheme, Style, Tokens};
use blocks::Tone;
use egui::{Color32, Ui};

/// The look a stage draws with: the scheme pair, a mode or the OS's, the app's style, and motion off when `still`.
#[derive(Clone, Debug)]
pub struct Look {
    pub schemes: PerMode<Scheme>,
    pub mode: Option<Mode>,
    pub style: Option<Style>,
    pub still: bool,
}

impl Default for Look {
    fn default() -> Self {
        Self {
            schemes: default().clone(),
            mode: None,
            style: None,
            still: false,
        }
    }
}

fn color(hex: &str) -> Color32 {
    let byte = |i: usize| {
        hex.get(i..i + 2)
            .and_then(|d| u8::from_str_radix(d, 16).ok())
            .unwrap_or(255)
    };
    Color32::from_rgba_unmultiplied(byte(1), byte(3), byte(5), byte(7))
}

impl Look {
    fn tokens(&self, ui: &Ui) -> &Tokens {
        let dark = self.mode.map_or(ui.visuals().dark_mode, |m| m == Mode::Dark);
        let s = if dark { &self.schemes.dark } else { &self.schemes.light };
        &s.tokens
    }

    pub(crate) fn fg(&self, ui: &Ui) -> Color32 {
        color(self.tokens(ui).fg.as_str())
    }

    pub(crate) fn mute(&self, ui: &Ui) -> Color32 {
        color(self.tokens(ui).mute.as_str())
    }

    pub(crate) fn tone(&self, ui: &Ui, tone: Option<&Tone>) -> Color32 {
        let t = self.tokens(ui);
        let hex = match tone {
            Some(Tone::Ok | Tone::Done) => &t.g,
            Some(Tone::Warn) => &t.a,
            Some(Tone::Bad | Tone::Fail) => &t.r,
            Some(Tone::Mute) => &t.mute,
            _ => &t.fg,
        };
        color(hex.as_str())
    }

    pub(crate) fn label(&self, role: LabelRole, text: &str) -> String {
        let Some(l) = self.style.as_ref().and_then(|s| s.labels.get(&role)) else {
            return text.into();
        };
        let text = match l.case {
            LabelCase::Upper => text.to_uppercase(),
            LabelCase::Lower => text.to_lowercase(),
            LabelCase::AsIs => text.into(),
        };
        format!(
            "{}{text}{}",
            String::from(l.prefix.clone()),
            String::from(l.suffix.clone())
        )
    }
}
