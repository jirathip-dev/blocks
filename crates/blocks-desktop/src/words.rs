use std::collections::HashMap;
use std::sync::Arc;

use egui::epaint::text::{ByteIndex, ByteRangeExt as _, Glyph, LayoutSection};
use egui::epaint::TextShape;
use egui::text::LayoutJob;
use egui::text_selection::LabelSelectionState;
use egui::{
    Color32, CursorIcon, FontId, FontSelection, Galley, Id, Label, OpenUrl, Response, Role, Sense, Stroke, TextFormat,
    TextWrapMode, Ui, WidgetInfo, WidgetText,
};
use icu_segmenter::options::LineBreakOptions;
use icu_segmenter::LineSegmenter;

const GAP: &str = " ";
const GAP_SIZE: f32 = 1e-6;
const KILLER: char = '\u{0E4C}';

fn thai(c: char) -> bool {
    ('\u{0E01}'..='\u{0E5B}').contains(&c)
}

fn joins(c: char) -> bool {
    matches!(c, '\u{0E2F}' | '\u{0E30}'..='\u{0E3A}' | '\u{0E45}'..='\u{0E4E}')
}

fn gap(g: &Glyph) -> bool {
    g.chr == ' ' && g.font_height <= GAP_SIZE * 4.0
}

fn has_thai(text: &str) -> bool {
    text.as_bytes().windows(2).any(|w| matches!(w, [0xE0, 0xB8 | 0xB9]))
}

/// Where a line may break inside the Thai of `text`: byte offsets, each between two Thai characters.
pub fn breaks(text: &str) -> Vec<usize> {
    if !has_thai(text) {
        return Vec::new();
    }
    let inside = |at: &usize| {
        let before = text.get(..*at).and_then(|s| s.chars().next_back());
        let mut after = text.get(*at..).unwrap_or_default().chars();
        let (next, then) = (after.next(), after.next());
        before.is_some_and(thai) && next.is_some_and(|c| thai(c) && !joins(c)) && then != Some(KILLER)
    };
    LineSegmenter::new_dictionary(LineBreakOptions::default())
        .segment_str(text)
        .filter(inside)
        .collect()
}

struct Soft {
    job: LayoutJob,
    text: String,
    sections: Vec<LayoutSection>,
    gaps: usize,
}

impl Soft {
    fn of(job: &LayoutJob) -> Option<Self> {
        if job.wrap.max_rows != usize::MAX {
            return None;
        }
        let mut cuts = breaks(&job.text).into_iter().peekable();
        cuts.peek()?;
        let mut out = LayoutJob {
            text: String::with_capacity(job.text.len() + GAP.len() * 8),
            sections: Vec::new(),
            ..job.clone()
        };
        let push = |out: &mut LayoutJob, piece: &str, format: TextFormat, leading_space: f32| {
            let start = out.text.len();
            out.text.push_str(piece);
            out.sections.push(LayoutSection {
                leading_space,
                byte_range: ByteIndex(start)..ByteIndex(out.text.len()),
                format,
            });
        };
        let mut gaps = 0;
        for s in &job.sections {
            let range = s.byte_range.as_usize();
            let (mut from, mut lead) = (range.start, s.leading_space);
            while let Some(cut) = cuts.next_if(|c| *c < range.end) {
                if cut > from {
                    push(
                        &mut out,
                        job.text.get(from..cut).unwrap_or_default(),
                        s.format.clone(),
                        lead,
                    );
                    lead = 0.0;
                }
                let format = TextFormat {
                    font_id: FontId::new(GAP_SIZE, s.format.font_id.family.clone()),
                    line_height: None,
                    ..s.format.clone()
                };
                push(&mut out, GAP, format, 0.0);
                gaps += 1;
                from = cut;
            }
            push(
                &mut out,
                job.text.get(from..range.end).unwrap_or_default(),
                s.format.clone(),
                lead,
            );
        }
        Some(Self {
            job: out,
            text: job.text.clone(),
            sections: job.sections.clone(),
            gaps,
        })
    }

    fn harden(&self, laid: &Galley) -> Option<Galley> {
        if laid.elided {
            return None;
        }
        let mut hard = laid.clone();
        let mut dropped = 0;
        for placed in &mut hard.rows {
            let here = placed.row.glyphs.iter().filter(|g| gap(g)).count();
            if here > 0 {
                Arc::make_mut(&mut placed.row).glyphs.retain(|g| !gap(g));
                dropped += here;
            }
        }
        if dropped != self.gaps {
            return None;
        }
        let mut sections = self.sections.clone();
        if let (Some(a), Some(b)) = (sections.first_mut(), laid.job.sections.first()) {
            a.leading_space = b.leading_space;
        }
        hard.job = Arc::new(LayoutJob {
            text: self.text.clone(),
            sections,
            ..(*laid.job).clone()
        });
        Some(hard)
    }
}

type Laid = (Arc<Galley>, Arc<Galley>, u64);

#[derive(Clone, Default)]
struct Kept {
    cut: HashMap<u64, (Option<Arc<Soft>>, u64)>,
    set: HashMap<usize, Laid>,
    swept: u64,
}

fn kept<R>(ui: &Ui, f: impl FnOnce(&mut Kept, u64) -> R) -> R {
    let pass = ui.ctx().cumulative_pass_nr();
    ui.data_mut(|d| {
        let k = d.get_temp_mut_or_default::<Kept>(Id::NULL);
        if k.swept != pass {
            k.cut.retain(|_, v| v.1 + 1 >= pass);
            k.set.retain(|_, v| v.2 + 1 >= pass);
            k.swept = pass;
        }
        f(k, pass)
    })
}

fn soften(ui: &Ui, job: &LayoutJob) -> Option<Arc<Soft>> {
    if !has_thai(&job.text) {
        return None;
    }
    let key = egui::util::hash(job);
    kept(ui, |k, pass| {
        let entry = k.cut.entry(key).or_insert_with(|| (Soft::of(job).map(Arc::new), pass));
        entry.1 = pass;
        entry.0.clone()
    })
}

fn hardened(ui: &Ui, soft: &Soft, laid: &Arc<Galley>) -> Arc<Galley> {
    let key = Arc::as_ptr(laid).addr();
    kept(ui, |k, pass| {
        if let Some(e) = k.set.get_mut(&key).filter(|e| Arc::ptr_eq(&e.0, laid)) {
            e.2 = pass;
            return e.1.clone();
        }
        let hard = soft.harden(laid).map_or_else(|| laid.clone(), Arc::new);
        k.set.insert(key, (laid.clone(), hard.clone(), pass));
        hard
    })
}

/// `layout_job(job)`, with Thai breaking between words: a many-row text field's layouter, an app's own kind.
pub fn lay(ui: &Ui, job: LayoutJob) -> Arc<Galley> {
    let Some(soft) = soften(ui, &job) else {
        return ui.fonts_mut(|f| f.layout_job(job));
    };
    let laid = ui.fonts_mut(|f| f.layout_job(soft.job.clone()));
    let hard = hardened(ui, &soft, &laid);
    if Arc::ptr_eq(&hard, &laid) {
        return ui.fonts_mut(|f| f.layout_job(job));
    }
    hard
}

/// `ui.label(text)`, with Thai in a label that wraps breaking between words.
pub fn label(ui: &mut Ui, text: impl Into<WidgetText>) -> Response {
    show(ui, text.into(), None, None)
}

/// The same, sensing: a card's tappable title.
pub fn sensing(ui: &mut Ui, text: impl Into<WidgetText>, sense: Sense) -> Response {
    show(ui, text.into(), Some(sense), None)
}

/// The same as a link that opens `url`: prose's.
pub fn link(ui: &mut Ui, text: impl Into<WidgetText>, url: &str) -> Response {
    show(ui, text.into(), Some(Sense::click()), Some(url))
}

fn soft_label(ui: &Ui, text: &WidgetText) -> Option<Arc<Soft>> {
    if ui.wrap_mode() != TextWrapMode::Wrap || matches!(text, WidgetText::Galley(_)) || !has_thai(text.text()) {
        return None;
    }
    let job = text
        .clone()
        .into_layout_job(ui.style(), FontSelection::Default, ui.text_valign());
    soften(ui, &job)
}

fn show(ui: &mut Ui, text: WidgetText, sense: Option<Sense>, url: Option<&str>) -> Response {
    let made = |t: WidgetText| match sense {
        Some(s) => Label::new(t).sense(s),
        None => Label::new(t),
    };
    let Some(soft) = soft_label(ui, &text) else {
        return match url {
            Some(u) => ui.hyperlink_to(text, u),
            None => ui.add(made(text)),
        };
    };
    let (pos, laid, response) = made(soft.job.clone().into()).layout_in_ui(ui);
    let galley = hardened(ui, &soft, &laid);
    let role = if url.is_some() { Role::Link } else { Role::Label };
    response.widget_info(|| WidgetInfo::labeled(role, ui.is_enabled(), galley.text()));
    if ui.is_rect_visible(response.rect) {
        let (color, underline) = ink(ui, &response, sense, url.is_some());
        if ui.style().interaction.selectable_labels {
            LabelSelectionState::label_text_selection(ui, &response, pos, galley, color, underline);
        } else {
            ui.painter()
                .add(TextShape::new(pos, galley, color).with_underline(underline));
        }
        if url.is_some() && response.hovered() {
            ui.set_cursor_icon(CursorIcon::PointingHand);
        }
    }
    let Some(url) = url else {
        return response;
    };
    let new_tab = response.clicked_with_open_in_background();
    if new_tab || response.clicked() {
        ui.open_url(OpenUrl {
            url: url.to_owned(),
            new_tab,
        });
    }
    if ui.style().url_in_tooltip {
        return response.on_hover_text(url);
    }
    response
}

fn ink(ui: &Ui, response: &Response, sense: Option<Sense>, link: bool) -> (Color32, Stroke) {
    if link {
        let color = ui.visuals().hyperlink_color;
        let on = response.hovered() || response.has_focus();
        let width = ui.style().interact(response).fg_stroke.width;
        return (color, if on { Stroke::new(width, color) } else { Stroke::NONE });
    }
    let color = if sense.is_some_and(|s| s != Sense::hover()) {
        ui.style().interact(response).text_color()
    } else {
        ui.visuals().text_color()
    };
    let on = response.has_focus() || response.highlighted();
    (color, if on { Stroke::new(1.0, color) } else { Stroke::NONE })
}
