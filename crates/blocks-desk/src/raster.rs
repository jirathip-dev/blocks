use std::collections::HashMap;

use egui::emath::Numeric;
use egui::epaint::{ClippedPrimitive, ImageData, Primitive, Vertex};
use egui::{Color32, Pos2, Rect, TextureId, TexturesDelta, Vec2};

const SEAM: f32 = 1e-4;

struct Image {
    width: usize,
    height: usize,
    pixels: Vec<Color32>,
}

impl Image {
    fn sample(&self, uv: Pos2) -> Color32 {
        let at = |t: f32, n: usize| {
            let i = usize::from_f64(f64::from(t) * n.to_f64());
            i.min(n.saturating_sub(1))
        };
        let (x, y) = (at(uv.x, self.width), at(uv.y, self.height));
        self.pixels.get(y * self.width + x).copied().unwrap_or(Color32::WHITE)
    }
}

#[derive(Default)]
pub(crate) struct Textures(HashMap<TextureId, Image>);

impl Textures {
    pub(crate) fn update(&mut self, delta: &TexturesDelta) {
        for (id, d) in delta.set.iter().flat_map(|(id, ds)| ds.iter().map(move |d| (id, d))) {
            let ImageData::Color(src) = &d.image;
            let [width, height] = src.size;
            let Some([x0, y0]) = d.pos else {
                let pixels = src.pixels.clone();
                self.0.insert(*id, Image { width, height, pixels });
                continue;
            };
            let Some(t) = self.0.get_mut(id) else { continue };
            for (y, row) in src.pixels.chunks(width.max(1)).enumerate() {
                let start = (y0 + y) * t.width + x0;
                if let Some(dst) = t.pixels.get_mut(start..start + row.len()) {
                    dst.copy_from_slice(row);
                }
            }
        }
    }

    pub(crate) fn free(&mut self, delta: &TexturesDelta) {
        for id in &delta.free {
            self.0.remove(id);
        }
    }
}

pub(crate) struct Canvas {
    width: u16,
    height: u16,
    pixels: Vec<Color32>,
}

fn edge(a: Pos2, b: Pos2, p: Pos2) -> f32 {
    (b - a).x * (p - a).y - (b - a).y * (p - a).x
}

fn span(v: [Pos2; 3], area: f32, y: f32, min: f32, max: f32) -> Option<(f32, f32)> {
    let [a, b, c] = v;
    let (mut lo, mut hi) = (min, max);
    for (p, q) in [(b, c), (c, a), (a, b)] {
        let k = -(q - p).y / area;
        let at0 = edge(p, q, Pos2::new(0.0, y)) / area;
        let x = (-SEAM - at0) / k;
        if k > 0.0 {
            lo = lo.max(x);
        } else if k < 0.0 {
            hi = hi.min(x);
        } else if at0 < -SEAM {
            return None;
        }
    }
    (lo <= hi).then_some((lo, hi))
}

fn texel(t: Option<&Image>, uv: Pos2) -> Color32 {
    t.map_or(Color32::WHITE, |t| t.sample(uv))
}

impl Canvas {
    pub(crate) fn new(width: u16, height: u16) -> Self {
        let pixels = vec![Color32::TRANSPARENT; usize::from(width) * usize::from(height)];
        Self { width, height, pixels }
    }

    pub(crate) fn paint(&mut self, prims: &[ClippedPrimitive], textures: &Textures) {
        self.pixels.fill(Color32::TRANSPARENT);
        let screen = Rect::from_min_size(Pos2::ZERO, Vec2::new(f32::from(self.width), f32::from(self.height)));
        for p in prims {
            let Primitive::Mesh(m) = &p.primitive else { continue };
            let t = textures.0.get(&m.texture_id);
            let clip = p.clip_rect.intersect(screen);
            let v = |i: u32| usize::try_from(i).ok().and_then(|i| m.vertices.get(i));
            for &[a, b, c] in m.indices.as_chunks::<3>().0 {
                if let (Some(a), Some(b), Some(c)) = (v(a), v(b), v(c)) {
                    self.triangle(clip, [a, b, c], t);
                }
            }
        }
    }

    fn triangle(&mut self, clip: Rect, [a, b, c]: [&Vertex; 3], t: Option<&Image>) {
        let area = edge(a.pos, b.pos, c.pos);
        let bound = Rect::from_points(&[a.pos, b.pos, c.pos]).intersect(clip);
        if area.abs() < f32::EPSILON || !bound.is_positive() {
            return;
        }
        let px = |v: f32| u16::from_f64(f64::from(v));
        let (y0, y1) = (px(bound.min.y.floor()), px(bound.max.y.ceil()));
        let same = a.color == b.color && b.color == c.color && a.uv == b.uv && b.uv == c.uv;
        let flat = same.then(|| a.color * texel(t, a.uv));
        let width = usize::from(self.width);
        for y in y0..y1.min(self.height) {
            let cy = f32::from(y) + 0.5;
            let Some((lo, hi)) = span([a.pos, b.pos, c.pos], area, cy, bound.min.x, bound.max.x) else {
                continue;
            };
            let (x0, x1) = (px((lo - 0.5 - SEAM).ceil()), px((hi - 0.5 + SEAM).floor() + 1.0));
            let x1 = x1.min(self.width);
            let row = usize::from(y) * width;
            let Some(dst) = self
                .pixels
                .get_mut(row + usize::from(x0)..row + usize::from(x1.max(x0)))
            else {
                continue;
            };
            if let Some(src) = flat.filter(|s| s.a() == u8::MAX) {
                dst.fill(src);
                continue;
            }
            for (d, x) in dst.iter_mut().zip(x0..) {
                let p = Pos2::new(f32::from(x) + 0.5, cy);
                let (wa, wb) = (edge(b.pos, c.pos, p) / area, edge(c.pos, a.pos, p) / area);
                let (wa, wb) = (wa.max(0.0), wb.max(0.0));
                let wc = (1.0 - wa - wb).max(0.0);
                let src = flat.unwrap_or_else(|| {
                    let ab = a.color.lerp_to_gamma(b.color, wb / (wa + wb).max(f32::EPSILON));
                    let uv = a.uv.to_vec2() * wa + b.uv.to_vec2() * wb + c.uv.to_vec2() * wc;
                    ab.lerp_to_gamma(c.color, wc) * texel(t, uv.to_pos2())
                });
                *d = d.blend(src);
            }
        }
    }

    pub(crate) fn png(&self) -> Vec<u8> {
        let rgba: Vec<u8> = self.pixels.iter().flat_map(Color32::to_srgba_unmultiplied).collect();
        crate::png::encode(u32::from(self.width), u32::from(self.height), &rgba)
    }
}
