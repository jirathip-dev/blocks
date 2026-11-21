use blocks::theme::{default, LabelCase, LabelRole, Mode, PerMode, Scheme, Style, Tokens};
use blocks::Tone;
use egui::emath::Numeric;
use egui::epaint::text::{FontInsert, FontPriority, InsertFontFamily};
use egui::{vec2, Color32, FontData, FontFamily, TextStyle, Ui};

pub(crate) const TAP: f32 = 44.0;
pub(crate) const FACE: f32 = 28.0;
pub(crate) const MARK: f32 = 3.0;
const FS: f32 = 13.0;
const FS_META: f32 = 11.0;
const S2: f32 = 8.0;
const S4: f32 = 16.0;
const TITLE: f32 = 1.7;

/// The look a stage draws with: the scheme pair, a mode or the OS's, the app's style, its faces first to last, and motion off when `still`.
#[derive(Clone, Debug)]
pub struct Look {
    pub schemes: PerMode<Scheme>,
    pub mode: Option<Mode>,
    pub style: Option<Style>,
    pub faces: Vec<FontData>,
    pub still: bool,
}

impl Default for Look {
    fn default() -> Self {
        Self {
            schemes: default().clone(),
            mode: None,
            style: None,
            faces: vec![],
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
    fn space(&self) -> f32 {
        self.style.as_ref().map_or(1.0, |s| f32::from_f64(f64::from(s.space)))
    }

    pub(crate) fn margin(&self) -> f32 {
        S4 * self.space()
    }

    pub(crate) fn dress(&self, ui: &mut Ui) {
        for (i, face) in self.faces.iter().enumerate().rev() {
            let first = InsertFontFamily {
                family: FontFamily::Proportional,
                priority: FontPriority::Highest,
            };
            let name = format!("blocks-face-{i}");
            if !ui.ctx().fonts(|f| f.definitions().font_data.contains_key(&name)) {
                ui.ctx().add_font(FontInsert::new(&name, face.clone(), vec![first]));
                ui.ctx().request_repaint();
            }
        }
        let gap = S2 * self.space();
        let s = ui.style_mut();
        s.spacing.item_spacing = vec2(gap, gap);
        for (style, font) in &mut s.text_styles {
            font.size = match style {
                TextStyle::Heading => FS * TITLE,
                TextStyle::Small => FS_META,
                _ => FS,
            };
        }
    }

    fn tokens(&self, ui: &Ui) -> &Tokens {
        let dark = self.mode.map_or(ui.visuals().dark_mode, |m| m == Mode::Dark);
        let s = if dark { &self.schemes.dark } else { &self.schemes.light };
        &s.tokens
    }

    pub(crate) fn bg(&self, ui: &Ui) -> Color32 {
        color(self.tokens(ui).bg.as_str())
    }

    pub(crate) fn fg(&self, ui: &Ui) -> Color32 {
        color(self.tokens(ui).fg.as_str())
    }

    pub(crate) fn mute(&self, ui: &Ui) -> Color32 {
        color(self.tokens(ui).mute.as_str())
    }

    pub(crate) fn line(&self, ui: &Ui) -> Color32 {
        color(self.tokens(ui).line.as_str())
    }

    pub(crate) fn card(&self, ui: &Ui) -> Color32 {
        color(self.tokens(ui).card.as_str())
    }

    pub(crate) fn link(&self, ui: &Ui) -> Color32 {
        color(self.tokens(ui).link.as_str())
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
