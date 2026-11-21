use blocks::{Attachment, Message, Role};
use egui::{vec2, Align2, Button, Label, RichText, Sense, TextStyle, TextWrapMode, Ui, WidgetText};

use crate::act;
use crate::cx::{Cx, Draw};
use crate::look::{FACE, TAP};
use crate::words;

pub(super) const DRAW: Option<Draw<Message>> = Some(draw);

fn draw(b: &Message, ui: &mut Ui, cx: &mut Cx<'_>) {
    let system = b.role == Role::System;
    if system {
        ui.separator();
        ui.visuals_mut().override_text_color = Some(cx.look.mute(ui));
    }
    ui.horizontal_top(|ui| {
        if !system {
            face(b, ui, cx);
        }
        ui.vertical(|ui| {
            if !cx.follows {
                head(b, ui, cx);
            }
            cx.blocks(ui, b.blocks.as_deref().unwrap_or_default());
            files(b.files.as_deref().unwrap_or_default(), ui, cx);
        });
    });
    if system {
        ui.separator();
    }
}

fn face(b: &Message, ui: &mut Ui, cx: &Cx<'_>) {
    let (rect, _) = ui.allocate_exact_size(vec2(FACE, FACE), Sense::hover());
    if cx.follows {
        return;
    }
    let look = cx.look;
    let (fill, ink) = if b.role == Role::Owner {
        (look.fg(ui), look.bg(ui))
    } else {
        (look.line(ui), look.fg(ui))
    };
    let initial: String = b.name.chars().take(1).flat_map(char::to_uppercase).collect();
    let font = TextStyle::Body.resolve(ui.style());
    ui.painter().rect_filled(rect, 0.0, fill);
    ui.painter()
        .text(rect.center(), Align2::CENTER_CENTER, initial, font, ink);
}

fn head(b: &Message, ui: &mut Ui, cx: &Cx<'_>) {
    let look = cx.look;
    let word = match &b.role {
        Role::Agent => "agent",
        Role::Owner => "owner",
        Role::System => "",
        Role::Other(s) => s.as_str(),
    };
    ui.horizontal(|ui| {
        let gap = ui.spacing().item_spacing.x;
        let meta = |ui: &Ui, s: &str| {
            WidgetText::from(RichText::new(s).small().color(look.mute(ui))).into_galley(
                ui,
                Some(TextWrapMode::Extend),
                f32::INFINITY,
                TextStyle::Small,
            )
        };
        let time = b.time.as_deref().filter(|t| !t.is_empty());
        let after: Vec<_> = [Some(word).filter(|w| !w.is_empty()), time]
            .into_iter()
            .flatten()
            .map(|s| meta(ui, s))
            .collect();
        let room = after
            .iter()
            .fold(ui.available_width(), |r, g| r - g.size().x - gap);
        ui.scope(|ui| {
            ui.set_max_width(room.max(0.0));
            ui.add(Label::new(RichText::new(&b.name).strong().color(look.fg(ui))).truncate());
        });
        for g in after {
            words::label(ui, g);
        }
    });
}

fn files(all: &[Attachment], ui: &mut Ui, cx: &mut Cx<'_>) {
    let images = all.iter().filter(|f| f.src.is_some());
    for f in images.chain(all.iter().filter(|f| f.src.is_none())) {
        let press = Button::new(&f.name)
            .truncate()
            .min_size(vec2(ui.available_width(), TAP));
        let action = f.tap.action.as_deref();
        let on = cx.act_on(action);
        if act::press_as(ui, cx, None, on, action, press) {
            act::tap(ui, cx, &f.tap);
        }
    }
}
