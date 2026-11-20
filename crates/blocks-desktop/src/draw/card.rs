use blocks::Card;
use egui::{Label, RichText, Sense, Ui};

use crate::act;
use crate::cx::{Cx, Draw};
use crate::text::shown;

pub(super) const DRAW: Option<Draw<Card>> = Some(draw);

fn draw(b: &Card, ui: &mut Ui, cx: &mut Cx<'_>) {
    let look = cx.look;
    let r = egui::Frame::group(ui.style()).stroke((1.0, look.tone(ui, b.tone.as_ref()))).show(ui, |ui| {
        ui.set_width(ui.available_width());
        let head = ui.horizontal_wrapped(|ui| {
            let title = RichText::new(b.title.as_deref().unwrap_or_default()).strong().color(look.fg(ui));
            let sense = if b.tap.is_some() { Sense::click() } else { Sense::hover() };
            let t = ui.add(Label::new(title).sense(sense));
            if let Some(l) = &b.badge {
                let text = shown(&l.text, cx.values(), cx.now);
                ui.label(RichText::new(text).color(look.tone(ui, l.tone.as_ref())));
            }
            if let Some(m) = &b.meta {
                ui.label(RichText::new(shown(m, cx.values(), cx.now)).color(look.mute(ui)));
            }
            t
        });
        if let Some(s) = &b.subtitle {
            super::row::toned(ui, cx, s);
        }
        cx.blocks(ui, b.blocks.as_deref().unwrap_or_default());
        ui.horizontal_wrapped(|ui| cx.blocks(ui, b.buttons.as_deref().unwrap_or_default()));
        head.inner
    });
    let Some(t) = &b.tap else { return };
    if let Some(a) = &t.action {
        cx.rec.action(a);
    }
    if let Some(me) = cx.me {
        cx.rec.tap(me, r.inner.rect, cx.on);
    }
    if r.inner.clicked() && cx.on {
        act::tap(ui, cx, t);
    }
}
