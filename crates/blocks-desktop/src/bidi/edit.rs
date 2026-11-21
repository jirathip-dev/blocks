use std::sync::Arc;

use egui::text::{CCursor, CCursorRange, LayoutJob};
use egui::{Align, Align2, Color32, Event, FontSelection, Key, Response, Stroke, TextBuffer, TextEdit, Ui};

use super::{lay, reads_rtl, rtl, Fit, Laid};

/// A text field of one row: egui's own until it holds a right-to-left character, then laid in visual order.
pub fn edit(ui: &mut Ui, text: &mut String, on: bool, set: impl FnOnce(TextEdit<'_>) -> TextEdit<'_>) -> Response {
    field(ui, text, false, on, set)
}

/// A text field of many rows, as `edit`.
pub fn area(ui: &mut Ui, text: &mut String, on: bool, set: impl FnOnce(TextEdit<'_>) -> TextEdit<'_>) -> Response {
    field(ui, text, true, on, set)
}

/// A secret's field: dots, so egui's own whatever is typed.
pub fn hidden(ui: &mut Ui, text: &mut String, on: bool, set: impl FnOnce(TextEdit<'_>) -> TextEdit<'_>) -> Response {
    ui.add_enabled(on, set(TextEdit::singleline(text).password(true)))
}

fn flip(ui: &Ui) {
    ui.ctx().input_mut(|i| {
        for e in &mut i.events {
            if let Event::Key { key, .. } = e {
                *key = match *key {
                    Key::ArrowLeft => Key::ArrowRight,
                    Key::ArrowRight => Key::ArrowLeft,
                    k => k,
                };
            }
        }
    });
}

fn make(t: &mut String, many: bool) -> TextEdit<'_> {
    if many {
        TextEdit::multiline(t)
    } else {
        TextEdit::singleline(t)
    }
}

fn field(
    ui: &mut Ui,
    text: &mut String,
    many: bool,
    on: bool,
    set: impl FnOnce(TextEdit<'_>) -> TextEdit<'_>,
) -> Response {
    if !rtl(text) {
        return ui.add_enabled(on, set(make(text, many)));
    }
    let id = ui.next_auto_id();
    let font = FontSelection::Default.resolve(ui.style());
    let color = ui.visuals().override_text_color.unwrap_or_else(|| ui.visuals().widgets.inactive.text_color());
    let (pen, fill) = (ui.visuals().text_cursor.stroke, ui.visuals().selection.bg_fill);
    let right = !many && reads_rtl(text);
    let job = |s: &str, w: f32| {
        let mut j = LayoutJob::simple(s.to_owned(), font.clone(), color, if many { w } else { f32::INFINITY });
        j.keep_trailing_whitespace = true;
        j.halign = if right { Align::RIGHT } else { Align::LEFT };
        j
    };
    let caret = |ui: &Ui| TextEdit::load_state(ui.ctx(), id).and_then(|s| s.cursor.char_range());
    let before = lay(ui, job(text, ui.available_width()), Fit::Column);
    let swap = ui.memory(|m| m.has_focus(id))
        && caret(ui).zip(before).is_some_and(|(c, l)| l.rtl_at(c.primary.index.0));
    if swap {
        flip(ui);
    }
    let mut last: Option<Arc<Laid>> = None;
    let mut layouter = |ui: &Ui, buf: &dyn TextBuffer, w: f32| {
        let j = job(buf.as_str(), w);
        match lay(ui, j.clone(), Fit::Column) {
            Some(l) => Arc::clone(&last.insert(l).galley),
            None => ui.fonts_mut(|f| f.layout_job(j)),
        }
    };
    let out = ui.scope(|ui| {
        if !on {
            ui.disable();
        }
        ui.visuals_mut().text_cursor.stroke = Stroke::NONE;
        ui.visuals_mut().selection.bg_fill = Color32::TRANSPARENT;
        let e = set(make(text, many)).id(id).font(font.clone()).text_color(color);
        let e = if right { e.align(Align2([Align::RIGHT, ui.layout().align2().y()])) } else { e };
        e.layouter(&mut layouter).show(ui)
    });
    if swap {
        flip(ui);
    }
    let out = out.inner;
    let Some(laid) = last else { return out.response.response };
    let r = out.response.response.clone();
    let origin = out.galley_pos;
    let mut range = out.cursor_range;
    if let Some(p) = ui.input(|i| i.pointer.interact_pos()).filter(|_| r.is_pointer_button_down_on()) {
        let at = laid.index_at(p - origin);
        let pressed = ui.input(|i| i.pointer.primary_pressed());
        let anchor = range.filter(|_| !pressed).map_or(at, |c| c.secondary.index.0);
        let mut state = out.state;
        state.cursor.set_char_range(Some(CCursorRange::two(CCursor::new(anchor), CCursor::new(at))));
        state.store(ui.ctx(), id);
        range = caret(ui);
    }
    if let Some(c) = range.filter(|_| r.has_focus()) {
        let (a, b) = (c.primary.index.0, c.secondary.index.0);
        for s in laid.spans(a.min(b)..a.max(b)) {
            ui.painter().rect_filled(s.translate(origin.to_vec2()), 0.0, fill.gamma_multiply(0.5));
        }
        let at = laid.caret(a).translate(origin.to_vec2());
        ui.painter().line_segment([at.left_top(), at.left_bottom()], pen);
    }
    r
}
