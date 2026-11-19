use blocks::behave::start;
use blocks::expr::State;
use blocks::tree::{expect, Node};
use blocks::{Action, Block, Built};
use egui::Ui;

use crate::cx::Cx;
use crate::draw::kinds;
use crate::drawn::{Drawn, Rec};
use crate::look::Look;

/// What the user did in a pass, for the app to carry out.
#[derive(Clone, Debug, PartialEq)]
pub enum Event {
    Act(Action),
    Open(String),
    Sheet(String),
    Thread(String),
    Refresh,
    Dropped(String),
}

/// What an app hands every pass: its look.
#[derive(Clone, Debug, Default)]
pub struct Kit {
    look: Look,
}

impl Kit {
    /// A kit that draws with `look`.
    pub fn new(look: Look) -> Self {
        Self { look }
    }
}

struct Held {
    block: Block,
    plan: Node,
}

/// One screen on this client: the screen, its local state and what the last pass drew.
#[derive(Default)]
pub struct Stage {
    held: Option<Held>,
    state: State,
    drawn: Option<Drawn>,
}

impl Stage {
    /// A screen or an op landed; `None` when the key closes.
    pub fn set(&mut self, screen: Option<&Block>) {
        let Some(b) = screen else {
            *self = Self::default();
            return;
        };
        let built = Built::new(serde_json::to_value(b).unwrap_or_default());
        if self.held.is_none() {
            self.state = start(&built);
        }
        let plan = expect(&built, &kinds(), &self.state);
        self.held = Some(Held { block: b.clone(), plan });
    }

    /// One pass: draws the screen into `ui` and gives back what the user did.
    pub fn show(&mut self, ui: &mut Ui, kit: &Kit, _unix_now: f64) -> Vec<Event> {
        let Some(h) = &self.held else { return vec![] };
        let mut rec = Rec::default();
        let mut cx = Cx::new(&kit.look, &mut rec, std::slice::from_ref(&h.plan));
        cx.block(ui, &h.block);
        self.drawn = cx.done().into_iter().next().map(|t| rec.done(t));
        vec![]
    }

    /// What the last pass drew.
    pub fn drawn(&self) -> Option<&Drawn> {
        self.drawn.as_ref()
    }

    /// The screen's local state.
    pub fn state(&self) -> &State {
        &self.state
    }
}
