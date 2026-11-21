use std::time::Duration;

use blocks::{Part, Prose, Span};
use egui::{vec2, Align, Color32, Layout, Frame, RichText, ScrollArea, Sense, Stroke, TextStyle, Ui};

use crate::bidi;
use crate::cx::{Cx, Draw};
use crate::look::{Look, MARK};

pub(super) const DRAW: Option<Draw<Prose>> = Some(draw);

fn draw(b: &Prose, ui: &mut Ui, cx: &mut Cx<'_>) {
    let look = cx.look;
    let streaming = b.streaming == Some(true);
    if streaming {
        ui.ctx().accesskit_node_builder(ui.unique_id(), egui::accesskit::Node::set_busy);
    }
    let last = b.parts.len().checked_sub(1);
    for (i, p) in b.parts.iter().enumerate() {
        part(p, i, ui, look, streaming && Some(i) == last);
    }
    match b.parts.last() {
        None | Some(Part::Rule) if streaming => caret(ui, look),
        None => {
            ui.allocate_space(vec2(ui.available_width(), ui.spacing().interact_size.y));
        }
        _ => {}
    }
}

fn part(p: &Part, at: usize, ui: &mut Ui, look: &Look, end: bool) {
    match p {
        Part::Heading { level, spans: s } => {
            let style = if *level <= 2 {
                TextStyle::Heading
            } else {
                TextStyle::Body
            };
            spans(ui, look, s, &style, end);
        }
        Part::Para { spans: s } => spans(ui, look, s, &TextStyle::Body, end),
        Part::List { ordered, items } => {
            let last = items.len().checked_sub(1);
            for (i, item) in items.iter().enumerate() {
                let mark = if *ordered { format!("{}.", i + 1) } else { "•".into() };
                ui.horizontal_top(|ui| {
                    bidi::label(ui, RichText::new(mark).color(look.mute(ui)));
                    spans(ui, look, item, &TextStyle::Body, end && Some(i) == last);
                });
            }
        }
        Part::Quote { spans: s } => {
            let r = ui.horizontal_top(|ui| {
                ui.add_space(ui.spacing().indent);
                spans(ui, look, s, &TextStyle::Body, end);
            });
            let rect = r.response.rect;
            let x = rect.left() + MARK / 2.0;
            ui.painter().vline(x, rect.y_range(), Stroke::new(MARK, look.line(ui)));
        }
        Part::Code { text, .. } => code(text, at, ui, look, end),
        Part::Rule => {
            ui.separator();
        }
    }
}

fn ink(ui: &Ui, look: &Look) -> Color32 {
    ui.visuals().override_text_color.unwrap_or_else(|| look.fg(ui))
}

fn spans(ui: &mut Ui, look: &Look, all: &[Span], style: &TextStyle, end: bool) {
    let said: String = all.iter().map(|s| s.text.as_str()).collect();
    let row = |ui: &mut Ui| {
        ui.spacing_mut().item_spacing.x = 0.0;
        for s in all {
            let mut t = RichText::new(&s.text).text_style(style.clone()).color(ink(ui, look));
            if s.bold == Some(true) || *style == TextStyle::Heading {
                t = t.strong();
            }
            if s.italic == Some(true) {
                t = t.italics();
            }
            if s.code == Some(true) {
                t = t.code();
            }
            match &s.link {
                Some(url) => {
                    let t = bidi::text(ui, t.color(look.link(ui)).underline());
                    ui.hyperlink_to(t, url)
                }
                None => bidi::label(ui, t),
            };
        }
        if end {
            caret(ui, look);
        }
    };
    if bidi::reads_rtl(&said) {
        let size = vec2(ui.available_size_before_wrap().x, ui.spacing().interact_size.y);
        ui.allocate_ui_with_layout(size, Layout::right_to_left(Align::Center).with_main_wrap(true), row);
    } else {
        ui.horizontal_wrapped(row);
    }
}

fn code(text: &str, at: usize, ui: &mut Ui, look: &Look, end: bool) {
    let frame = Frame::group(ui.style())
        .fill(look.card(ui))
        .stroke((1.0, look.line(ui)));
    frame.show(ui, |ui| {
        ui.set_width(ui.available_width());
        ScrollArea::horizontal().id_salt(("code", at)).show(ui, |ui| {
            ui.horizontal(|ui| {
                bidi::label(ui, RichText::new(text).monospace().color(ink(ui, look)));
                if end {
                    caret(ui, look);
                }
            });
        });
    });
}

fn caret(ui: &mut Ui, look: &Look) {
    let tall = ui.text_style_height(&TextStyle::Body);
    let (rect, _) = ui.allocate_exact_size(vec2(tall / 2.0, tall), Sense::hover());
    let shown = look.still || ui.input(|i| i.time).rem_euclid(1.0) < 0.5;
    if shown {
        ui.painter().rect_filled(rect, 0.0, ink(ui, look));
    }
    if !look.still {
        ui.ctx().request_repaint_after(Duration::from_millis(500));
    }
}
