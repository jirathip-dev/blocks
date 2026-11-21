mod atoms;
mod edit;
mod place;

use std::collections::HashMap;
use std::ops::Range;
use std::sync::Arc;

use egui::epaint::ClippedShape;
use egui::text::{LayoutJob, TextWrapping};
use egui::{FontSelection, Galley, Id, Label, Rect, Response, Sense, Shape, Ui, Vec2, WidgetText};
use unicode_bidi::{bidi_class, BidiClass, BidiInfo, Level};

pub use edit::{area, edit, hidden};

use crate::words;

/// The box a text is set in: a label's own width, or the column a block of text owns.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum Fit {
    Own,
    Column,
}

/// A text laid out with every row in visual order; `galley.text()` is the logical text.
#[derive(Clone, Debug)]
pub struct Laid {
    pub galley: Arc<Galley>,
    lines: Vec<Line>,
}

#[derive(Clone, Debug)]
struct Line {
    rtl: bool,
    cells: Vec<Cell>,
}

#[derive(Clone, Copy, Debug)]
struct Cell {
    x: f32,
    width: f32,
    rtl: bool,
}

struct Made {
    shaped: LayoutJob,
    from: Arc<Galley>,
    laid: Arc<Laid>,
}

#[derive(Clone, Default)]
struct Kept {
    pass: u64,
    now: HashMap<u64, Arc<Made>>,
    was: HashMap<u64, Arc<Made>>,
}

fn rtl(text: &str) -> bool {
    text.chars()
        .any(|c| matches!(bidi_class(c), BidiClass::R | BidiClass::AL))
}

/// Whether `text` reads right to left: its first strong character does.
#[must_use]
pub fn reads_rtl(text: &str) -> bool {
    BidiInfo::new(text, None)
        .paragraphs
        .first()
        .is_some_and(|p| p.level.is_rtl())
}

/// `job` with every row in visual order, or `None` when it has no right-to-left character and egui's own galley is right.
pub fn lay(ui: &Ui, job: &LayoutJob, fit: Fit) -> Option<Arc<Laid>> {
    if !rtl(&job.text) {
        return None;
    }
    let (key, pass, id) = (
        egui::util::hash((job, fit)),
        ui.ctx().cumulative_pass_nr(),
        Id::unique("bidi"),
    );
    let kept = ui.data_mut(|d| {
        let k: &mut Kept = d.get_temp_mut_or_default(id);
        if k.pass != pass {
            k.was = std::mem::take(&mut k.now);
            k.pass = pass;
        }
        k.now.get(&key).or_else(|| k.was.get(&key)).cloned()
    });
    let made = match kept {
        Some(m) if Arc::ptr_eq(&ui.fonts_mut(|f| f.layout_job(m.shaped.clone())), &m.from) => m,
        _ => {
            let info = BidiInfo::new(&job.text, None);
            let atoms = atoms::cut(job, &info);
            let shaped = atoms::shaped(job, &atoms);
            let from = ui.fonts_mut(|f| f.layout_job(shaped.clone()));
            let laid = Arc::new(place::place(job.clone(), &info, &atoms, &from, fit)?);
            Arc::new(Made { shaped, from, laid })
        }
    };
    let laid = Arc::clone(&made.laid);
    ui.data_mut(|d| d.get_temp_mut_or_default::<Kept>(id).now.insert(key, made));
    Some(laid)
}

fn laid(ui: &Ui, t: &WidgetText, fit: Fit) -> Option<Arc<Galley>> {
    if !rtl(t.text()) {
        return None;
    }
    let job = t
        .clone()
        .into_layout_job(ui.style(), FontSelection::Default, ui.text_valign());
    let mut job = Arc::unwrap_or_clone(job);
    job.wrap = TextWrapping::from_wrap_mode_and_width(ui.wrap_mode(), ui.available_width());
    job.halign = ui.layout().horizontal_placement();
    lay(ui, &job, fit).map(|l| Arc::clone(&l.galley))
}

/// A label in its own box: right-to-left text in visual order, aligned to the box's right edge.
pub fn label(ui: &mut Ui, t: impl Into<WidgetText>) -> Response {
    let t = t.into();
    match laid(ui, &t, Fit::Own) {
        Some(g) => ui.add(Label::new(g).selectable(false)),
        None => words::label(ui, t),
    }
}

/// A block of text that owns its column: a right-to-left paragraph ends at the column's right edge.
pub fn para(ui: &mut Ui, t: impl Into<WidgetText>) -> Response {
    let t = t.into();
    match laid(ui, &t, Fit::Column) {
        Some(g) => ui.add(Label::new(g).selectable(false)),
        None => words::label(ui, t),
    }
}

/// A label that senses `sense`: a card's tappable title.
pub fn sensing(ui: &mut Ui, t: impl Into<WidgetText>, sense: Sense) -> Response {
    let t = t.into();
    match laid(ui, &t, Fit::Own) {
        Some(g) => ui.add(Label::new(g).selectable(false).sense(sense)),
        None => words::sensing(ui, t, sense),
    }
}

/// A link that opens `url`: prose's.
pub fn link(ui: &mut Ui, t: impl Into<WidgetText>, url: &str) -> Response {
    let t = t.into();
    match laid(ui, &t, Fit::Own) {
        Some(g) => ui.hyperlink_to(g, url),
        None => words::link(ui, t, url),
    }
}

/// The text of a button, a chip, a hint or a tooltip, laid in visual order when it reads right to left.
pub fn text(ui: &Ui, t: impl Into<WidgetText>) -> WidgetText {
    let t = t.into();
    laid(ui, &t, Fit::Own).map_or(t, WidgetText::Galley)
}

/// Each painted text with a right-to-left character whose rows are not in the Unicode bidi algorithm's order.
#[must_use]
pub fn faults(shapes: &[ClippedShape]) -> Vec<String> {
    fn visit(s: &Shape, out: &mut Vec<String>) {
        match s {
            Shape::Vec(all) => all.iter().for_each(|s| visit(s, out)),
            Shape::Text(t) if !in_order(&t.galley) => out.push(format!("{:?} is drawn out of order", t.galley.text())),
            _ => {}
        }
    }
    let mut out = vec![];
    for s in shapes {
        visit(&s.shape, &mut out);
    }
    out
}

fn in_order(g: &Galley) -> bool {
    let text = g.text();
    if !rtl(text) {
        return true;
    }
    let info = BidiInfo::new(text, None);
    let mut at = 0;
    for row in &g.rows {
        let Some(rest) = text.get(at..) else { return false };
        let chars: Vec<(usize, char)> = rest.char_indices().take(row.glyphs.len()).collect();
        let bytes: usize = chars.iter().map(|(_, c)| c.len_utf8()).sum();
        let Some(para) = info.paragraphs.iter().find(|p| p.range.contains(&at)) else {
            return false;
        };
        let want = info.reorder_line(para, at..at + bytes);
        let back = |i: usize| {
            chars
                .get(i)
                .and_then(|(b, _)| info.levels.get(at + b))
                .is_some_and(Level::is_rtl)
        };
        let mut seen: Vec<(f32, usize, char)> = row
            .glyphs
            .iter()
            .enumerate()
            .map(|(i, g)| (g.pos.x, i, g.chr))
            .collect();
        seen.sort_by(|a, b| {
            a.0.total_cmp(&b.0)
                .then(if back(a.1) { b.1.cmp(&a.1) } else { a.1.cmp(&b.1) })
        });
        if seen.iter().map(|s| s.2).ne(want.chars()) {
            return false;
        }
        at += bytes + usize::from(row.ends_with_newline);
    }
    at >= text.len()
}

impl Laid {
    fn at(&self, index: usize) -> (usize, usize) {
        let (mut left, n) = (index, self.galley.rows.len());
        for (r, row) in self.galley.rows.iter().enumerate() {
            let len = row.glyphs.len();
            if left < len || (left == len && (!row.ends_with_newline || r + 1 == n)) {
                return (r, left);
            }
            left = left.saturating_sub(len + usize::from(row.ends_with_newline));
        }
        (n.saturating_sub(1), 0)
    }

    fn cell(&self, r: usize, col: usize) -> Option<(Cell, Rect)> {
        let row = self.galley.rows.get(r)?;
        let c = *self.lines.get(r)?.cells.get(col)?;
        let x = row.pos.x + c.x;
        Some((c, Rect::from_x_y_ranges(x..=x + c.width, row.rect().y_range())))
    }

    /// Where the caret before character `index` is drawn, as a zero-width rect in the galley.
    #[must_use]
    pub fn caret(&self, index: usize) -> Rect {
        let (r, col) = self.at(index);
        let before = col.checked_sub(1).and_then(|i| self.cell(r, i));
        let x = match (before, self.cell(r, col)) {
            (Some((c, b)), _) => {
                if c.rtl {
                    b.left()
                } else {
                    b.right()
                }
            }
            (None, Some((c, b))) => {
                if c.rtl {
                    b.right()
                } else {
                    b.left()
                }
            }
            (None, None) => self.galley.rows.get(r).map_or(0.0, |p| p.pos.x),
        };
        let y = self
            .galley
            .rows
            .get(r)
            .map_or(self.galley.rect.y_range(), |p| p.rect().y_range());
        Rect::from_x_y_ranges(x..=x, y)
    }

    /// The caret index nearest a point in the galley.
    #[must_use]
    pub fn index_at(&self, at: Vec2) -> usize {
        let rows = &self.galley.rows;
        let r = rows
            .iter()
            .position(|p| at.y < p.rect().bottom())
            .unwrap_or(rows.len().saturating_sub(1));
        let before: usize = rows
            .iter()
            .take(r)
            .map(|p| p.glyphs.len() + usize::from(p.ends_with_newline))
            .sum();
        let x = at.x - rows.get(r).map_or(0.0, |p| p.pos.x);
        let cells = self.lines.get(r).map(|l| l.cells.as_slice()).unwrap_or_default();
        let near = |c: &Cell| (c.x + c.width / 2.0 - x).abs();
        let hit = cells
            .iter()
            .enumerate()
            .filter(|(_, c)| c.width > 0.0)
            .min_by(|a, b| near(a.1).total_cmp(&near(b.1)));
        let Some((i, c)) = hit else { return before };
        before + if (x > c.x + c.width / 2.0) == c.rtl { i } else { i + 1 }
    }

    /// The boxes a selection of `chars` covers, one per character.
    #[must_use]
    pub fn spans(&self, chars: Range<usize>) -> Vec<Rect> {
        chars
            .filter_map(|i| {
                let (r, col) = self.at(i);
                self.cell(r, col)
            })
            .map(|(_, b)| b)
            .collect()
    }

    /// Whether the character before the caret reads right to left: the arrows swap while it does.
    #[must_use]
    pub fn rtl_at(&self, index: usize) -> bool {
        let (r, col) = self.at(index);
        let cell = col
            .checked_sub(1)
            .and_then(|i| self.cell(r, i))
            .or_else(|| self.cell(r, col));
        cell.map_or_else(|| self.lines.get(r).is_some_and(|l| l.rtl), |(c, _)| c.rtl)
    }
}
