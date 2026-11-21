use blocks::{Tone, Tool, ToolState};
use egui::{
    vec2, Align, Align2, Color32, Frame, Id, Label, Layout, RichText, Role, ScrollArea, Sense, Shape, Stroke,
    TextStyle, Ui, UiBuilder, WidgetInfo,
};

use crate::cx::{Cx, Draw};
use crate::look::{MARK, TAP};
use crate::words;

pub(super) const DRAW: Option<Draw<Tool>> = Some(draw);

const LINES: f32 = 12.0;
const NAME_SHARE: f32 = 0.4;

fn draw(b: &Tool, ui: &mut Ui, cx: &mut Cx<'_>) {
    let look = cx.look;
    let key =
        b.id.as_deref()
            .map_or_else(|| ui.scope_id().with("open"), |id| Id::unique(("tool-open", id)));
    let open = b.body.is_some() && ui.data(|d| d.get_temp::<bool>(key)).unwrap_or_default();
    if b.state == ToolState::Running {
        ui.ctx().accesskit_node_builder(ui.unique_id(), egui::accesskit::Node::set_busy);
    }
    let edge = if b.state == ToolState::Failed {
        look.tone(ui, Some(&Tone::Bad))
    } else {
        look.line(ui)
    };
    Frame::new().stroke(Stroke::new(1.0, edge)).show(ui, |ui| {
        ui.set_width(ui.available_width());
        if head(b, ui, cx, open) {
            ui.data_mut(|d| d.insert_temp(key, !open));
            ui.ctx().request_repaint();
        }
        let Some(body) = b.body.as_deref().filter(|_| open) else {
            return;
        };
        let tall = ui.text_style_height(&TextStyle::Monospace) * LINES;
        Frame::group(ui.style())
            .fill(look.card(ui))
            .stroke(Stroke::NONE)
            .show(ui, |ui| {
                ui.set_width(ui.available_width());
                ScrollArea::both().id_salt("body").max_height(tall).show(ui, |ui| {
                    words::label(ui, RichText::new(body).monospace().color(look.fg(ui)));
                });
            });
    });
}

fn head(b: &Tool, ui: &mut Ui, cx: &mut Cx<'_>, open: bool) -> bool {
    let look = cx.look;
    let (rect, _) = ui.allocate_exact_size(vec2(ui.available_width(), TAP), Sense::hover());
    let inner = rect.shrink2(vec2(ui.spacing().button_padding.x, 0.0));
    let tone = match b.state {
        ToolState::Running | ToolState::Done => None,
        ToolState::Failed => Some(Tone::Bad),
        ToolState::Other(_) => Some(Tone::Mute),
    };
    let toned = look.tone(ui, tone.as_ref());
    let fold = b.body.is_some();
    let quiet = |t: RichText| Label::new(t).truncate().selectable(false);
    let mut row = ui.new_child(
        UiBuilder::new()
            .max_rect(inner)
            .layout(Layout::left_to_right(Align::Center)),
    );
    mark(&b.state, &mut row, toned);
    row.scope(|ui| {
        ui.set_max_width(inner.width() * NAME_SHARE);
        ui.add(quiet(RichText::new(&b.name).monospace().strong().color(look.fg(ui))));
    });
    row.with_layout(Layout::right_to_left(Align::Center), |ui| {
        if fold {
            ui.add(quiet(
                RichText::new(if open { "⌄" } else { "›" })
                    .monospace()
                    .color(look.mute(ui)),
            ));
        }
        let summary = b.summary.as_deref().unwrap_or_default();
        let color = if b.state == ToolState::Failed {
            toned
        } else {
            look.mute(ui)
        };
        ui.with_layout(Layout::left_to_right(Align::Center), |ui| {
            ui.add(quiet(RichText::new(summary).color(color)));
        });
    });
    if !fold {
        return false;
    }
    let r = ui.interact(rect, ui.scope_id().with("head"), Sense::click());
    r.widget_info(|| WidgetInfo::selected(Role::Button, cx.on, open, &b.name));
    if let Some(me) = cx.me {
        cx.rec.tap(me, rect, cx.on);
    }
    r.clicked() && cx.on
}

fn mark(state: &ToolState, ui: &mut Ui, color: Color32) {
    let side = ui.text_style_height(&TextStyle::Body);
    let (rect, _) = ui.allocate_exact_size(vec2(side, side), Sense::hover());
    let at = |x: f32, y: f32| rect.lerp_inside(vec2(x, y));
    let pen = Stroke::new(MARK / 2.0, color);
    let painter = ui.painter();
    match state {
        ToolState::Running => {
            let font = TextStyle::Monospace.resolve(ui.style());
            painter.text(rect.center(), Align2::CENTER_CENTER, "↻", font, color);
        }
        ToolState::Done => {
            painter.add(Shape::line(vec![at(0.2, 0.55), at(0.42, 0.75), at(0.8, 0.3)], pen));
        }
        ToolState::Failed => {
            painter.line_segment([at(0.25, 0.25), at(0.75, 0.75)], pen);
            painter.line_segment([at(0.75, 0.25), at(0.25, 0.75)], pen);
        }
        ToolState::Other(_) => {
            painter.circle_filled(rect.center(), side / 8.0, color);
        }
    }
}
