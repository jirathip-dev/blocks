use std::ops::Range;
use std::sync::Arc;

use egui::epaint::text::{ByteIndex, ByteRangeExt as _, FontsView, LayoutSection, TextFormat};
use egui::text::LayoutJob;
use egui::{Align, Galley, Rect, Vec2};
use unicode_bidi::{BidiClass, BidiInfo, Level};

const MARK: char = '\u{2060}';
const SPARE: char = '\u{2063}';
const PAIRS: [(char, char); 6] = [('(', ')'), ('[', ']'), ('{', '}'), ('<', '>'), ('«', '»'), ('‹', '›')];

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Fit {
    Own,
    Column,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Cell {
    pub x: f32,
    pub width: f32,
    pub rtl: bool,
}

#[derive(Clone, Debug)]
pub struct Line {
    pub rtl: bool,
    pub x: f32,
    pub width: f32,
    pub cells: Vec<Cell>,
}

#[derive(Clone, Debug)]
pub struct Laid {
    pub galley: Arc<Galley>,
    pub lines: Vec<Line>,
    pub words: usize,
    pub spread: usize,
}

#[derive(Clone, Copy, Debug, PartialEq)]
enum Kind {
    Ltr,
    Word(BidiClass),
    One,
    Newline,
}

#[derive(Clone, Debug)]
struct Atom {
    bytes: Range<usize>,
    level: Level,
    kind: Kind,
    space: bool,
}

struct Piece {
    atom: usize,
    glyphs: Range<usize>,
    verts: Range<usize>,
    x: f32,
    width: f32,
    level: Level,
    skip: usize,
    whole: bool,
}

#[allow(dead_code)]
pub fn has_rtl(text: &str) -> bool {
    text.bytes().any(|b| b >= 0xD6) && BidiInfo::new(text, None).has_rtl()
}

fn odd_script_number(c: char) -> bool {
    matches!(u32::from(c), 0x0600..=0x0605 | 0x066A..=0x066D | 0x06DD | 0x06F0..=0x06F9 | 0x08E2 | 0x10D30..=0x10D39 | 0x10E60..=0x10E7E)
}

fn mirrored(c: char) -> char {
    PAIRS
        .iter()
        .find_map(|&(a, b)| {
            if c == a {
                Some(b)
            } else if c == b {
                Some(a)
            } else {
                None
            }
        })
        .unwrap_or(c)
}

fn atoms(job: &LayoutJob, info: &BidiInfo<'_>) -> Vec<Atom> {
    let cuts: Vec<usize> = job.sections.iter().map(|s| s.byte_range.as_usize().start).collect();
    let mut out: Vec<Atom> = vec![];
    let mut strong = None;
    for (at, c) in job.text.char_indices() {
        let (level, class) = (info.levels[at], info.original_classes[at]);
        let letter = matches!(class, BidiClass::R | BidiClass::AL);
        let kind = if c == '\n' {
            Kind::Newline
        } else if !level.is_rtl() {
            if odd_script_number(c) {
                Kind::One
            } else {
                Kind::Ltr
            }
        } else if letter {
            strong = Some(class);
            Kind::Word(class)
        } else if class == BidiClass::NSM || c == '\u{200C}' || c == '\u{200D}' {
            Kind::Word(strong.unwrap_or(BidiClass::R))
        } else {
            Kind::One
        };
        let end = at + c.len_utf8();
        match out.last_mut() {
            Some(a)
                if a.kind == kind
                    && a.level == level
                    && !matches!(kind, Kind::One | Kind::Newline)
                    && !cuts.contains(&at) =>
            {
                a.bytes.end = end;
            }
            _ => out.push(Atom {
                bytes: at..end,
                level,
                kind,
                space: kind == Kind::One && c.is_whitespace(),
            }),
        }
    }
    out
}

fn shaped(job: &LayoutJob, atoms: &[Atom]) -> LayoutJob {
    let mut out = LayoutJob {
        text: String::new(),
        sections: vec![],
        halign: Align::LEFT,
        justify: false,
        ..job.clone()
    };
    let mut push = |text: &str, lead: f32, format: &TextFormat| {
        let start = out.text.len();
        out.text.push_str(text);
        out.sections.push(LayoutSection {
            leading_space: lead,
            byte_range: ByteIndex(start)..ByteIndex(out.text.len()),
            format: format.clone(),
        });
    };
    for a in atoms {
        let section = job
            .sections
            .iter()
            .find(|s| s.byte_range.as_usize().contains(&a.bytes.start));
        let Some(section) = section else { continue };
        let lead = if section.byte_range.as_usize().start == a.bytes.start {
            section.leading_space
        } else {
            0.0
        };
        let text = &job.text[a.bytes.clone()];
        match a.kind {
            Kind::Newline => {
                push("\n", lead, &section.format);
                continue;
            }
            Kind::One if a.level.is_rtl() => {
                let m: String = text.chars().map(mirrored).collect();
                push(&m, lead, &section.format);
            }
            _ => push(&text.replace(MARK, &SPARE.to_string()), lead, &section.format),
        }
        push(&MARK.to_string(), 0.0, &section.format);
    }
    out
}

fn uniform(n: usize, x: f32, width: f32, rtl: bool) -> Vec<Cell> {
    let w = width / n.max(1) as f32;
    (0..n)
        .map(|i| {
            let slot = if rtl { n - 1 - i } else { i };
            Cell {
                x: x + w * slot as f32,
                width: w,
                rtl,
            }
        })
        .collect()
}

fn word(chars: &[char], glyphs: &[egui::epaint::text::Glyph], dx: f32) -> Option<Vec<Cell>> {
    let real = glyphs
        .iter()
        .rposition(|g| g.advance_width != 0.0 || !g.uv_rect.is_nothing())
        .map_or(0, |i| i + 1);
    let mut cells = vec![None; chars.len()];
    let mut end = chars.len();
    let mut open: Option<(usize, f32, f32)> = None;
    for g in &glyphs[..real] {
        let joins = open.is_some_and(|(at, _, w)| chars[at] == g.chr && (w == 0.0 || g.advance_width == 0.0));
        if let (true, Some((_, x, w))) = (joins, open.as_mut()) {
            if g.advance_width != 0.0 {
                *x = g.pos.x;
            }
            *w += g.advance_width;
            continue;
        }
        if let Some((at, x, w)) = open.take() {
            cells[at] = Some((x, w));
            end = at;
        }
        let at = chars[..end].iter().rposition(|c| *c == g.chr)?;
        open = Some((at, g.pos.x, g.advance_width));
    }
    let (at, x, w) = open?;
    cells[at] = Some((x, w));
    if at != 0 {
        return None;
    }
    let mut last = (0.0, 0.0);
    Some(
        cells
            .into_iter()
            .map(|c| {
                let (x, width) = c.map_or((last.0, 0.0), |c| c);
                last = (x, width);
                Cell {
                    x: x + dx,
                    width,
                    rtl: true,
                }
            })
            .collect(),
    )
}

pub fn lay(fonts: &mut FontsView<'_>, job: LayoutJob, fit: Fit) -> Option<Laid> {
    let info = BidiInfo::new(&job.text, None);
    if !info.has_rtl() {
        return None;
    }
    let atoms = atoms(&job, &info);
    let mut galley = Arc::unwrap_or_clone(fonts.layout_job(shaped(&job, &atoms)));
    let marks: usize = galley
        .rows
        .iter()
        .flat_map(|r| &r.glyphs)
        .filter(|g| g.chr == MARK)
        .count();
    let want = atoms.iter().filter(|a| a.kind != Kind::Newline).count();
    if marks != want && !galley.elided {
        return None;
    }
    let scale = galley.pixels_per_point;
    let snap = |x: f32| (x * scale).round() / scale;
    let para = |byte: usize| {
        let p = info.paragraphs.iter().find(|p| p.range.contains(&byte));
        p.map_or(Level::ltr(), |p| p.level)
    };
    let (mut at, mut used, mut lines) = (0, 0, vec![]);
    let (mut words, mut spread) = (0, 0);
    for placed in &mut galley.rows {
        let row = Arc::make_mut(&mut placed.row);
        let base = para(
            atoms
                .get(at)
                .map_or(job.text.len().saturating_sub(1), |a| a.bytes.start),
        );
        let (mut pieces, mut start, mut x) = (vec![], 0, 0.0);
        let mut close =
            |pieces: &mut Vec<Piece>, at: usize, glyphs: Range<usize>, x: f32, end: f32, vend: usize, whole: bool| {
                let (skip, n) = (used, glyphs.len());
                used = if whole { 0 } else { used + n };
                if n == 0 {
                    return;
                }
                let v0 = row.glyphs[glyphs.start].first_vertex as usize;
                pieces.push(Piece {
                    atom: at,
                    glyphs,
                    verts: v0..vend,
                    x,
                    width: end - x,
                    level: atoms.get(at).map_or(base, |a| a.level),
                    skip,
                    whole,
                });
            };
        for (i, g) in row.glyphs.iter().enumerate() {
            if g.chr == MARK {
                close(&mut pieces, at, start..i, x, g.pos.x, g.first_vertex as usize, true);
                (at, start, x) = (at + 1, i + 1, g.pos.x);
            }
        }
        close(
            &mut pieces,
            at,
            start..row.glyphs.len(),
            x,
            row.size.x,
            row.visuals.glyph_vertex_range.end,
            false,
        );
        if placed.ends_with_newline {
            at += 1;
        }
        for p in pieces.iter_mut().rev() {
            if !atoms.get(p.atom).is_some_and(|a| a.space) {
                break;
            }
            p.level = base;
        }
        let levels: Vec<Level> = pieces.iter().map(|p| p.level).collect();
        let mut moved = vec![0.0; pieces.len()];
        let mut cursor = 0.0;
        for i in BidiInfo::reorder_visual(&levels) {
            moved[i] = snap(cursor - pieces[i].x);
            cursor += pieces[i].width;
        }
        let mut cells = vec![];
        let mut glyphs = vec![];
        for (p, dx) in pieces.iter().zip(&moved) {
            for v in &mut row.visuals.mesh.vertices[p.verts.clone()] {
                v.pos.x += dx;
            }
            let Some(a) = atoms.get(p.atom) else { continue };
            let all: Vec<char> = job.text[a.bytes.clone()].chars().collect();
            let left = &all[p.skip.min(all.len())..];
            let old = &row.glyphs[p.glyphs.clone()];
            let chars = if p.whole {
                left
            } else {
                &left[..old.len().min(left.len())]
            };
            let rtl = matches!(a.kind, Kind::Word(_));
            let made = if !rtl && old.len() == chars.len() {
                old.iter()
                    .map(|g| Cell {
                        x: g.pos.x + dx,
                        width: g.advance_width,
                        rtl: a.level.is_rtl(),
                    })
                    .collect()
            } else {
                let found = if rtl && p.whole && p.skip == 0 {
                    word(chars, old, *dx)
                } else {
                    None
                };
                words += usize::from(rtl);
                spread += usize::from(rtl && found.is_none());
                found.unwrap_or_else(|| uniform(chars.len(), p.x + dx, p.width, rtl))
            };
            for (c, cell) in chars.iter().zip(&made) {
                let mut g = old[0];
                (g.chr, g.pos.x, g.advance_width) = (*c, cell.x, cell.width);
                glyphs.push(g);
            }
            cells.extend(made);
        }
        row.glyphs = glyphs;
        row.visuals.mesh_bounds = row.visuals.mesh.calc_bounds();
        lines.push(Line {
            rtl: base.is_rtl(),
            x: 0.0,
            width: row.size.x,
            cells,
        });
    }
    let widest = galley.rows.iter().map(|r| r.size.x).fold(0.0, f32::max);
    let column = fit == Fit::Column && job.wrap.max_width.is_finite();
    let width = if column { job.wrap.max_width } else { widest };
    let mut bounds = Rect::NOTHING;
    for (placed, line) in galley.rows.iter_mut().zip(&mut lines) {
        let free = width - placed.row.size.x;
        placed.pos.x = match job.halign {
            Align::LEFT if line.rtl => snap(free),
            Align::LEFT => 0.0,
            Align::Center => snap(free / 2.0 - width / 2.0),
            Align::RIGHT => snap(free - width),
        };
        line.x = placed.pos.x;
        bounds |= placed.row.visuals.mesh_bounds.translate(placed.pos.to_vec2());
    }
    let left = match job.halign {
        Align::LEFT => 0.0,
        Align::Center => -width / 2.0,
        Align::RIGHT => -width,
    };
    galley.rect = Rect::from_min_size(
        egui::pos2(left, galley.rect.top()),
        Vec2::new(width, galley.rect.height()),
    );
    galley.mesh_bounds = bounds;
    galley.job = Arc::new(job);
    Some(Laid {
        galley: Arc::new(galley),
        lines,
        words,
        spread,
    })
}

impl Laid {
    fn at(&self, index: usize) -> (usize, usize) {
        let mut left = index;
        for (r, row) in self.galley.rows.iter().enumerate() {
            let n = row.glyphs.len();
            if left <= n && (left < n || !row.ends_with_newline || r + 1 == self.galley.rows.len()) {
                return (r, left);
            }
            left = left.saturating_sub(n + usize::from(row.ends_with_newline));
        }
        (self.lines.len().saturating_sub(1), 0)
    }

    pub fn caret(&self, index: usize) -> f32 {
        let (r, col) = self.at(index);
        let Some(line) = self.lines.get(r) else { return 0.0 };
        let edge = |c: &Cell, after: bool| if c.rtl == after { c.x } else { c.x + c.width };
        let x = match (col.checked_sub(1).and_then(|i| line.cells.get(i)), line.cells.get(col)) {
            (Some(before), _) => edge(before, true),
            (None, Some(next)) => edge(next, false),
            (None, None) if line.rtl => line.width,
            (None, None) => 0.0,
        };
        line.x + x
    }

    pub fn rtl_at(&self, index: usize) -> bool {
        let (r, col) = self.at(index);
        let Some(line) = self.lines.get(r) else { return false };
        let cell = col
            .checked_sub(1)
            .and_then(|i| line.cells.get(i))
            .or(line.cells.get(col));
        cell.map_or(line.rtl, |c| c.rtl)
    }

    pub fn index_at(&self, row: usize, x: f32) -> usize {
        let before: usize = self.galley.rows[..row]
            .iter()
            .map(|r| r.glyphs.len() + usize::from(r.ends_with_newline))
            .sum();
        let line = &self.lines[row];
        let x = x - line.x;
        let hit = line
            .cells
            .iter()
            .enumerate()
            .filter(|(_, c)| c.width > 0.0)
            .min_by(|a, b| {
                let d = |c: &Cell| (c.x + c.width / 2.0 - x).abs();
                d(a.1).total_cmp(&d(b.1))
            });
        let Some((i, c)) = hit else { return before };
        let right = x > c.x + c.width / 2.0;
        before + if right == c.rtl { i } else { i + 1 }
    }
}
