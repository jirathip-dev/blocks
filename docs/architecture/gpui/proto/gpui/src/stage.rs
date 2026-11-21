use std::collections::BTreeMap;

use blocks::{apply, ApplyError, Block, Op};
use gpui::{div, prelude::*, px, Context, Entity, EventEmitter, ScrollHandle, Window};

use crate::draw::{self, Cx};
use crate::field::Field;
use crate::look::Look;

pub enum Event {
    Tap(String),
    Send { action: String, text: String },
}

pub struct Stage {
    screen: Option<Block>,
    look: Look,
    pub scroll: ScrollHandle,
    fields: BTreeMap<String, Entity<Field>>,
}

impl EventEmitter<Event> for Stage {}

impl Stage {
    pub fn new(look: Look, screen: Option<Block>) -> Self {
        Self {
            screen,
            look,
            scroll: ScrollHandle::new(),
            fields: BTreeMap::new(),
        }
    }

    pub fn apply(&mut self, ops: &[Op], cx: &mut Context<Self>) -> Result<(), ApplyError> {
        let done = self.screen.as_mut().map_or(Ok(()), |s| apply(s, ops));
        cx.notify();
        done
    }
}

impl Render for Stage {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let look = self.look;
        let screen = self.screen.take();
        let tree = screen.as_ref().map(|b| {
            let mut d = Cx {
                look,
                fields: &mut self.fields,
                cx,
            };
            draw::block(b, 0, &mut d)
        });
        self.screen = screen;
        div()
            .id("stage")
            .size_full()
            .bg(look.bg)
            .text_color(look.fg)
            .text_size(px(14.0))
            .overflow_y_scroll()
            .track_scroll(&self.scroll)
            .children(tree)
    }
}
