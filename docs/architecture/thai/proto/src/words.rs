use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use egui::epaint::text::{ByteIndex, ByteRangeExt as _, Glyph, LayoutSection};
use egui::epaint::TextShape;
use egui::text::LayoutJob;
use egui::text_selection::LabelSelectionState;
use egui::{
    FontId, FontSelection, Galley, Id, Label, Response, Role, Sense, Stroke, TextWrapMode, Ui, WidgetInfo, WidgetText,
};
use icu_segmenter::options::LineBreakOptions;
use icu_segmenter::LineSegmenter;

const GAP: char = ' ';
const GAP_SIZE: f32 = 1e-6;
const KILLER: char = '\u{0E4C}';

#[derive(Clone, Copy, PartialEq, Eq, Debug, Hash)]
pub enum Engine {
    Dictionary,
    Lstm,
}

fn thai(c: char) -> bool {
    ('\u{0E01}'..='\u{0E5B}').contains(&c)
}

fn joins(c: char) -> bool {
    matches!(c, '\u{0E2F}' | '\u{0E30}'..='\u{0E3A}' | '\u{0E45}'..='\u{0E4E}')
}

fn gap(g: &Glyph) -> bool {
    g.chr == GAP && g.font_height <= GAP_SIZE * 4.0
}

pub fn has_thai(text: &str) -> bool {
    text.as_bytes()
        .windows(2)
        .any(|w| w[0] == 0xE0 && (w[1] == 0xB8 || w[1] == 0xB9))
}

pub fn breaks(text: &str, engine: Engine) -> Vec<usize> {
    if !has_thai(text) {
        return vec![];
    }
    let options = LineBreakOptions::default();
    let all: Vec<usize> = match engine {
        Engine::Dictionary => LineSegmenter::new_dictionary(options).segment_str(text).collect(),
        Engine::Lstm => LineSegmenter::new_lstm(options).segment_str(text).collect(),
    };
    let inside = |&at: &usize| {
        let before = text[..at].chars().next_back();
        let mut after = text[at..].chars();
        let (next, then) = (after.next(), after.next());
        before.is_some_and(thai) && next.is_some_and(|c| thai(c) && !joins(c)) && then != Some(KILLER)
    };
    all.into_iter().filter(inside).collect()
}

pub struct Soft {
    pub job: LayoutJob,
    text: String,
    sections: Vec<LayoutSection>,
    gaps: usize,
}

impl Soft {
    pub fn of(job: &LayoutJob, engine: Engine) -> Option<Self> {
        if job.wrap.max_rows != usize::MAX {
            return None;
        }
        let cuts = breaks(&job.text, engine);
        if cuts.is_empty() {
            return None;
        }
        let text = String::with_capacity(job.text.len() + cuts.len());
        let mut out = LayoutJob {
            text,
            sections: vec![],
            ..job.clone()
        };
        let push = |out: &mut LayoutJob, piece: &str, format: egui::TextFormat, lead: f32| {
            let start = out.text.len();
            out.text.push_str(piece);
            let byte_range = ByteIndex(start)..ByteIndex(out.text.len());
            out.sections.push(LayoutSection {
                leading_space: lead,
                byte_range,
                format,
            });
        };
        let mut gaps = 0;
        let mut cuts = cuts.into_iter().peekable();
        for s in &job.sections {
            let range = s.byte_range.as_usize();
            let (mut from, mut lead) = (range.start, s.leading_space);
            while let Some(cut) = cuts.next_if(|&c| c < range.end) {
                if cut > from {
                    push(&mut out, &job.text[from..cut], s.format.clone(), lead);
                    lead = 0.0;
                }
                let mut format = s.format.clone();
                format.font_id = FontId::new(GAP_SIZE, format.font_id.family.clone());
                format.line_height = None;
                push(&mut out, GAP.encode_utf8(&mut [0; 4]), format, 0.0);
                gaps += 1;
                from = cut;
            }
            push(&mut out, &job.text[from..range.end], s.format.clone(), lead);
        }
        Some(Self {
            job: out,
            text: job.text.clone(),
            sections: job.sections.clone(),
            gaps,
        })
    }

    pub fn harden(&self, laid: &Galley) -> Option<Galley> {
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

#[derive(Default)]
struct Kept {
    cut: HashMap<u64, (Option<Arc<Soft>>, u64)>,
    set: HashMap<usize, (Arc<Galley>, Arc<Galley>, u64)>,
    swept: u64,
}

fn kept<R>(ui: &Ui, keep: bool, f: impl FnOnce(&mut Kept, u64) -> R) -> R {
    if !keep {
        return f(&mut Kept::default(), 0);
    }
    let all: Arc<Mutex<Kept>> = ui.data_mut(|d| d.get_temp_mut_or_default::<Arc<Mutex<Kept>>>(Id::NULL).clone());
    let pass = ui.ctx().cumulative_pass_nr();
    let mut k = all.lock().unwrap();
    if k.swept != pass {
        k.cut.retain(|_, v| v.1 + 1 >= pass);
        k.set.retain(|_, v| v.2 + 1 >= pass);
        k.swept = pass;
    }
    f(&mut k, pass)
}

fn soften(ui: &Ui, job: &LayoutJob, engine: Engine, keep: bool) -> Option<Arc<Soft>> {
    let key = egui::util::hash((job, engine));
    kept(ui, keep, |k, pass| {
        let entry = k
            .cut
            .entry(key)
            .or_insert_with(|| (Soft::of(job, engine).map(Arc::new), pass));
        entry.1 = pass;
        entry.0.clone()
    })
}

fn hardened(ui: &Ui, soft: &Soft, laid: &Arc<Galley>, keep: bool) -> Arc<Galley> {
    let key = Arc::as_ptr(laid) as usize;
    kept(ui, keep, |k, pass| {
        if let Some(e) = k.set.get_mut(&key).filter(|e| Arc::ptr_eq(&e.0, laid)) {
            e.2 = pass;
            return e.1.clone();
        }
        let hard = soft.harden(laid).map_or_else(|| laid.clone(), Arc::new);
        k.set.insert(key, (laid.clone(), hard.clone(), pass));
        hard
    })
}

pub fn lay(ui: &Ui, job: LayoutJob, engine: Engine, keep: bool) -> Arc<Galley> {
    let Some(soft) = soften(ui, &job, engine, keep) else {
        return ui.fonts_mut(|f| f.layout_job(job));
    };
    let laid = ui.fonts_mut(|f| f.layout_job(soft.job.clone()));
    let hard = hardened(ui, &soft, &laid, keep);
    if Arc::ptr_eq(&hard, &laid) {
        return ui.fonts_mut(|f| f.layout_job(job));
    }
    hard
}

pub fn label(ui: &mut Ui, text: impl Into<WidgetText>, sense: Option<Sense>, engine: Engine, keep: bool) -> Response {
    let text = text.into();
    let made = |text: WidgetText| {
        let label = Label::new(text);
        match sense {
            Some(s) => label.sense(s),
            None => label,
        }
    };
    if ui.wrap_mode() != TextWrapMode::Wrap || !has_thai(text.text()) {
        return ui.add(made(text));
    }
    let job = text
        .clone()
        .into_layout_job(ui.style(), FontSelection::Default, ui.text_valign());
    let Some(soft) = soften(ui, &job, engine, keep) else {
        return ui.add(made(text));
    };
    let (pos, laid, response) = made(soft.job.clone().into()).layout_in_ui(ui);
    let galley = hardened(ui, &soft, &laid, keep);
    response.widget_info(|| WidgetInfo::labeled(Role::Label, ui.is_enabled(), galley.text()));
    if ui.is_rect_visible(response.rect) {
        let color = match sense {
            Some(s) if s != Sense::hover() => ui.style().interact(&response).text_color(),
            _ => ui.style().visuals.text_color(),
        };
        let underline = if response.has_focus() || response.highlighted() {
            Stroke::new(1.0, color)
        } else {
            Stroke::NONE
        };
        if ui.style().interaction.selectable_labels {
            LabelSelectionState::label_text_selection(ui, &response, pos, galley, color, underline);
        } else {
            ui.painter()
                .add(TextShape::new(pos, galley, color).with_underline(underline));
        }
    }
    response
}
