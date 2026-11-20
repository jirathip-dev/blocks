use blocks::{Shown, Stat, Tone};
use serde_json::Number;
use egui::emath::Numeric;
use egui::{pos2, vec2, RichText, Sense, Stroke, Ui};

use crate::cx::{Cx, Draw};
use crate::text::shown;

pub(super) const DRAW: Option<Draw<Stat>> = Some(draw);

struct Tile<'a> {
    label: Option<&'a str>,
    value: Option<&'a Shown>,
    unit: Option<&'a str>,
    tone: Option<&'a Tone>,
    spark: &'a [Number],
}

fn draw(b: &Stat, ui: &mut Ui, cx: &mut Cx<'_>) {
    let one = Tile {
        label: b.label.as_deref(),
        value: b.value.as_ref(),
        unit: b.unit.as_deref(),
        tone: b.tone.as_ref(),
        spark: b.spark.as_deref().unwrap_or_default(),
    };
    let tiles: Vec<Tile<'_>> = match &b.items {
        Some(items) => items
            .iter()
            .map(|i| Tile {
                label: Some(&i.label),
                value: Some(&i.value),
                unit: i.unit.as_deref(),
                tone: i.tone.as_ref(),
                spark: i.spark.as_deref().unwrap_or_default(),
            })
            .collect(),
        None => vec![one],
    };
    if tiles.is_empty() {
        ui.allocate_space(vec2(ui.available_width(), ui.spacing().interact_size.y));
    }
    ui.horizontal_wrapped(|ui| {
        for t in &tiles {
            ui.vertical(|ui| tile(t, ui, cx));
        }
    });
}

fn tile(t: &Tile<'_>, ui: &mut Ui, cx: &Cx<'_>) {
    let look = cx.look;
    let value = t.value.map(|v| shown(v, cx.values(), cx.now)).unwrap_or_default();
    let unit = t.unit.map(|u| format!(" {u}")).unwrap_or_default();
    ui.label(RichText::new(format!("{value}{unit}")).strong().size(20.0).color(look.tone(ui, t.tone)));
    if let Some(l) = t.label {
        ui.label(RichText::new(l).color(look.mute(ui)));
    }
    let points: Vec<f64> = t.spark.iter().filter_map(Number::as_f64).collect();
    if points.len() < 2 {
        return;
    }
    let hi = points.iter().copied().fold(1.0, f64::max);
    let (r, painter) = ui.allocate_painter(vec2(64.0, 12.0), Sense::hover());
    let step = r.rect.width() / f32::from(u16::try_from(points.len() - 1).unwrap_or(u16::MAX));
    let line: Vec<_> = (0u16..)
        .zip(&points)
        .map(|(x, v)| {
            let y = f32::from_f64(v / hi * 10.0);
            pos2(r.rect.left() + f32::from(x) * step, r.rect.bottom() - y)
        })
        .collect();
    painter.add(egui::Shape::line(line, Stroke::new(1.0, look.tone(ui, t.tone))));
}
