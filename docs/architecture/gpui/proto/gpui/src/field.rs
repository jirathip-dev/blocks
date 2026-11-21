use std::ops::Range;

use gpui::{
    canvas, div, prelude::*, Bounds, Context, ElementInputHandler, EntityInputHandler, EventEmitter, FocusHandle,
    Focusable, KeyDownEvent, Pixels, Point, Role, SharedString, UTF16Selection, Window,
};

use crate::look::Look;

pub struct Sent(pub String);

pub struct Field {
    focus: FocusHandle,
    text: String,
    marked: Option<Range<usize>>,
    pub placeholder: SharedString,
    pub look: Look,
}

impl EventEmitter<Sent> for Field {}

impl Field {
    pub fn new(placeholder: SharedString, look: Look, cx: &mut Context<Self>) -> Self {
        Self {
            focus: cx.focus_handle(),
            text: String::new(),
            marked: None,
            placeholder,
            look,
        }
    }

    fn byte(&self, utf16: usize) -> usize {
        let mut seen = 0;
        for (i, c) in self.text.char_indices() {
            if seen >= utf16 {
                return i;
            }
            seen += c.len_utf16();
        }
        self.text.len()
    }

    fn utf16(&self, byte: usize) -> usize {
        self.text.get(..byte).map_or(0, |s| s.encode_utf16().count())
    }

    fn put(&mut self, range: Option<Range<usize>>, new: &str) -> usize {
        let range = range
            .map(|r| self.byte(r.start)..self.byte(r.end))
            .or(self.marked.clone())
            .unwrap_or(self.text.len()..self.text.len());
        self.text.replace_range(range.clone(), new);
        range.start
    }

    fn key(&mut self, e: &KeyDownEvent, _window: &mut Window, cx: &mut Context<Self>) {
        match e.keystroke.key.as_str() {
            "backspace" => {
                self.text.pop();
                self.marked = None;
            }
            "enter" if self.marked.is_none() && !self.text.is_empty() => {
                cx.emit(Sent(std::mem::take(&mut self.text)));
            }
            _ => return,
        }
        cx.notify();
    }
}

impl Focusable for Field {
    fn focus_handle(&self, _: &gpui::App) -> FocusHandle {
        self.focus.clone()
    }
}

impl EntityInputHandler for Field {
    fn text_for_range(
        &mut self,
        range: Range<usize>,
        actual: &mut Option<Range<usize>>,
        _window: &mut Window,
        _cx: &mut Context<Self>,
    ) -> Option<String> {
        let bytes = self.byte(range.start)..self.byte(range.end);
        actual.replace(self.utf16(bytes.start)..self.utf16(bytes.end));
        self.text.get(bytes).map(str::to_owned)
    }

    fn selected_text_range(
        &mut self,
        _ignore_disabled_input: bool,
        _window: &mut Window,
        _cx: &mut Context<Self>,
    ) -> Option<UTF16Selection> {
        let end = self.utf16(self.text.len());
        Some(UTF16Selection {
            range: end..end,
            reversed: false,
        })
    }

    fn marked_text_range(&self, _window: &mut Window, _cx: &mut Context<Self>) -> Option<Range<usize>> {
        self.marked.as_ref().map(|r| self.utf16(r.start)..self.utf16(r.end))
    }

    fn unmark_text(&mut self, _window: &mut Window, cx: &mut Context<Self>) {
        self.marked = None;
        cx.notify();
    }

    fn replace_text_in_range(
        &mut self,
        range: Option<Range<usize>>,
        text: &str,
        _window: &mut Window,
        cx: &mut Context<Self>,
    ) {
        self.put(range, text);
        self.marked = None;
        cx.notify();
    }

    fn replace_and_mark_text_in_range(
        &mut self,
        range: Option<Range<usize>>,
        new_text: &str,
        _new_selected_range: Option<Range<usize>>,
        _window: &mut Window,
        cx: &mut Context<Self>,
    ) {
        let start = self.put(range, new_text);
        self.marked = (!new_text.is_empty()).then(|| start..start + new_text.len());
        cx.notify();
    }

    fn bounds_for_range(
        &mut self,
        _range_utf16: Range<usize>,
        element_bounds: Bounds<Pixels>,
        _window: &mut Window,
        _cx: &mut Context<Self>,
    ) -> Option<Bounds<Pixels>> {
        Some(element_bounds)
    }

    fn character_index_for_point(
        &mut self,
        _point: Point<Pixels>,
        _window: &mut Window,
        _cx: &mut Context<Self>,
    ) -> Option<usize> {
        Some(self.utf16(self.text.len()))
    }
}

impl Render for Field {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let empty = self.text.is_empty();
        let shown: SharedString = if empty {
            self.placeholder.clone()
        } else {
            self.text.clone().into()
        };
        let focus = self.focus.clone();
        let me = cx.entity();
        let focused = self.focus.is_focused(window);
        div()
            .id("field")
            .role(Role::TextInput)
            .aria_label(self.placeholder.clone())
            .track_focus(&self.focus)
            .on_key_down(cx.listener(Self::key))
            .relative()
            .flex_1()
            .px_2()
            .py_1()
            .rounded_md()
            .border_1()
            .border_color(if focused { self.look.link } else { self.look.line })
            .text_color(if empty { self.look.mute } else { self.look.fg })
            .child(shown)
            .child(
                canvas(
                    |_, _, _| (),
                    move |bounds, (), window, cx| {
                        window.handle_input(&focus, ElementInputHandler::new(bounds, me.clone()), cx);
                    },
                )
                .absolute()
                .size_full(),
            )
    }
}
