use std::ops::Range;
use std::sync::Arc;

use egui::epaint::text::{Glyph, Row};
use egui::text::LayoutJob;
use egui::{pos2, Align, Galley, Rect, Vec2};
use unicode_bidi::{BidiInfo, Level};

use super::atoms::{Atom, Kind, MARK};
use super::{Cell, Fit, Laid, Line};

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

fn zero(w: f32) -> bool {
    w.abs() <= f32::EPSILON
}

fn snap(scale: f32, x: f32) -> f32 {
    (x * scale).round() / scale
}

fn float(n: usize) -> f32 {
    f32::from(u16::try_from(n).unwrap_or(u16::MAX))
}

fn vertex(g: &Glyph) -> usize {
    usize::try_from(g.first_vertex).unwrap_or(usize::MAX)
}

fn uniform(n: usize, x: f32, width: f32, rtl: bool) -> Vec<Cell> {
    let w = width / float(n.max(1));
    (0..n)
        .map(|i| Cell {
            x: x + w * float(if rtl { n - 1 - i } else { i }),
            width: w,
            rtl,
        })
        .collect()
}

fn word(chars: &[char], glyphs: &[Glyph], dx: f32) -> Option<Vec<Cell>> {
    let real = glyphs
        .iter()
        .rposition(|g| !zero(g.advance_width) || !g.uv_rect.is_nothing());
    let mut cells: Vec<Option<(f32, f32)>> = vec![None; chars.len()];
    let mut end = chars.len();
    let mut open: Option<(usize, f32, f32)> = None;
    for g in glyphs.get(..real.map_or(0, |i| i + 1))? {
        if let Some((at, x, w)) = open.as_mut() {
            if chars.get(*at) == Some(&g.chr) && (zero(*w) || zero(g.advance_width)) {
                if !zero(g.advance_width) {
                    *x = g.pos.x;
                }
                *w += g.advance_width;
                continue;
            }
        }
        if let Some((at, x, w)) = open.take() {
            *cells.get_mut(at)? = Some((x, w));
            end = at;
        }
        let at = chars.get(..end)?.iter().rposition(|c| *c == g.chr)?;
        open = Some((at, g.pos.x, g.advance_width));
    }
    let (at, x, w) = open?;
    *cells.get_mut(at)? = Some((x, w));
    if at != 0 {
        return None;
    }
    let mut last = 0.0;
    let cells = cells.into_iter().map(|c| {
        let (x, width) = c.unwrap_or((last, 0.0));
        last = x;
        Cell {
            x: x + dx,
            width,
            rtl: true,
        }
    });
    Some(cells.collect())
}

fn pieces(row: &Row, atoms: &[Atom], at: &mut usize, used: &mut usize, base: Level) -> Vec<Piece> {
    let mut out = vec![];
    let (mut start, mut x) = (0, 0.0);
    let ends = row.glyphs.iter().enumerate().filter(|(_, g)| g.chr == MARK);
    let ends = ends.map(|(i, g)| (i, g.pos.x, vertex(g), true));
    let last = (row.glyphs.len(), row.size.x, row.visuals.glyph_vertex_range.end, false);
    for (i, end, vend, whole) in ends.chain([last]) {
        let skip = *used;
        *used = if whole { 0 } else { *used + i - start };
        if let Some(g) = row.glyphs.get(start).filter(|_| i > start) {
            out.push(Piece {
                atom: *at,
                glyphs: start..i,
                verts: vertex(g)..vend,
                x,
                width: end - x,
                level: atoms.get(*at).map_or(base, |a| a.level),
                skip,
                whole,
            });
        }
        if whole {
            (*at, start, x) = (*at + 1, i + 1, end);
        }
    }
    for p in out.iter_mut().rev() {
        if !atoms.get(p.atom).is_some_and(|a| a.space) {
            break;
        }
        p.level = base;
    }
    out
}

fn rebuild(row: &mut Row, pieces: &[Piece], moved: &[f32], atoms: &[Atom], text: &str) -> Vec<Cell> {
    let (mut cells, mut glyphs) = (vec![], vec![]);
    for (p, dx) in pieces.iter().zip(moved) {
        for v in row.visuals.mesh.vertices.get_mut(p.verts.clone()).unwrap_or_default() {
            v.pos.x += dx;
        }
        let Some(a) = atoms.get(p.atom) else { continue };
        let all: Vec<char> = text.get(a.bytes.clone()).unwrap_or_default().chars().collect();
        let left = all.get(p.skip..).unwrap_or_default();
        let old = row.glyphs.get(p.glyphs.clone()).unwrap_or_default();
        let chars = if p.whole {
            left
        } else {
            left.get(..old.len()).unwrap_or(left)
        };
        let rtl = matches!(a.kind, Kind::Word(_));
        let made = if !rtl && old.len() == chars.len() {
            let cell = |g: &Glyph| Cell {
                x: g.pos.x + dx,
                width: g.advance_width,
                rtl: a.level.is_rtl(),
            };
            old.iter().map(cell).collect()
        } else {
            let found = if rtl && p.whole && p.skip == 0 {
                word(chars, old, *dx)
            } else {
                None
            };
            found.unwrap_or_else(|| uniform(chars.len(), p.x + dx, p.width, rtl))
        };
        let Some(first) = old.first() else { continue };
        for (c, cell) in chars.iter().zip(&made) {
            let mut g = *first;
            (g.chr, g.pos.x, g.advance_width) = (*c, cell.x, cell.width);
            glyphs.push(g);
        }
        cells.extend(made);
    }
    row.glyphs = glyphs;
    cells
}

fn align(galley: &mut Galley, lines: &[Line], job: &LayoutJob, fit: Fit) {
    let scale = galley.pixels_per_point;
    let widest = galley.rows.iter().map(|r| r.size.x).fold(0.0, f32::max);
    let column = fit == Fit::Column && job.wrap.max_width.is_finite();
    let width = if column { job.wrap.max_width } else { widest };
    let mut bounds = Rect::NOTHING;
    for (placed, line) in galley.rows.iter_mut().zip(lines) {
        let free = width - placed.row.size.x;
        placed.pos.x = match job.halign {
            Align::LEFT if line.rtl => snap(scale, free),
            Align::LEFT => 0.0,
            Align::Center => snap(scale, free / 2.0 - width / 2.0),
            Align::RIGHT => snap(scale, free - width),
        };
        bounds |= placed.row.visuals.mesh_bounds.translate(placed.pos.to_vec2());
    }
    let left = match job.halign {
        Align::LEFT => 0.0,
        Align::Center => -width / 2.0,
        Align::RIGHT => -width,
    };
    galley.rect = Rect::from_min_size(pos2(left, galley.rect.top()), Vec2::new(width, galley.rect.height()));
    galley.mesh_bounds = bounds;
}

pub(super) fn place(job: LayoutJob, info: &BidiInfo<'_>, atoms: &[Atom], from: &Galley, fit: Fit) -> Option<Laid> {
    let mut galley = from.clone();
    let marks = galley
        .rows
        .iter()
        .flat_map(|r| &r.glyphs)
        .filter(|g| g.chr == MARK)
        .count();
    if marks != atoms.iter().filter(|a| a.kind != Kind::Newline).count() && !galley.elided {
        return None;
    }
    let scale = galley.pixels_per_point;
    let para = |byte: usize| {
        info.paragraphs
            .iter()
            .find(|p| p.range.contains(&byte))
            .map_or(Level::ltr(), |p| p.level)
    };
    let (mut at, mut used, mut lines) = (0, 0, vec![]);
    for placed in &mut galley.rows {
        let row = Arc::make_mut(&mut placed.row);
        let base = para(
            atoms
                .get(at)
                .map_or(job.text.len().saturating_sub(1), |a| a.bytes.start),
        );
        let pieces = pieces(row, atoms, &mut at, &mut used, base);
        if placed.ends_with_newline {
            at += 1;
        }
        let levels: Vec<Level> = pieces.iter().map(|p| p.level).collect();
        let mut moved = vec![0.0; pieces.len()];
        let mut cursor = 0.0;
        for i in BidiInfo::reorder_visual(&levels) {
            if let (Some(p), Some(m)) = (pieces.get(i), moved.get_mut(i)) {
                *m = snap(scale, cursor - p.x);
                cursor += p.width;
            }
        }
        let cells = rebuild(row, &pieces, &moved, atoms, &job.text);
        row.visuals.mesh_bounds = row.visuals.mesh.calc_bounds();
        lines.push(Line {
            rtl: base.is_rtl(),
            cells,
        });
    }
    align(&mut galley, &lines, &job, fit);
    galley.job = Arc::new(job);
    Some(Laid {
        galley: Arc::new(galley),
        lines,
    })
}
