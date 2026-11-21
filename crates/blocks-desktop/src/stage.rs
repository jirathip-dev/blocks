use std::rc::Rc;

use blocks::behave::{lit, start, view};
use blocks::expr::{eval, Lit, State};
use blocks::tree::{expect, Node};
use blocks::{AppBlock, Block, Built};
use egui::{Frame, Ui};
use serde_json::Value;

use crate::act::{Did, Event};
use crate::art::{Art, Plain};
use crate::cx::{Cx, Ground, Local};
use crate::draw::kinds;
use crate::drawn::{Drawn, Rec};
use crate::island::{Apps, Island, Live, Out, Styled};
use crate::look::Look;

/// What an app hands every pass: its look, its art, its own kinds, its islands and its wraps.
#[derive(Clone)]
pub struct Kit {
    look: Look,
    art: Rc<dyn Art>,
    apps: Apps,
}

/// An app kind refused because a core kind has its name.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Clash {
    pub kind: String,
}

impl Default for Kit {
    fn default() -> Self {
        Self::new(Look::default())
    }
}

impl Kit {
    /// A kit that draws with `look` and no art.
    pub fn new(look: Look) -> Self {
        Self {
            look,
            art: Rc::new(Plain),
            apps: Apps::default(),
        }
    }

    /// The kit with `art` for figures and words.
    #[must_use]
    pub fn art(self, art: impl Art + 'static) -> Self {
        Self {
            art: Rc::new(art),
            ..self
        }
    }

    /// The kit with `draw` for the app's own kind `name`; a core kind's name is refused.
    pub fn kind(
        mut self,
        name: &str,
        draw: impl Fn(&mut Ui, &AppBlock, &mut Out<'_>) + 'static,
    ) -> Result<Self, Clash> {
        if Block::KINDS.contains(&name) {
            return Err(Clash { kind: name.into() });
        }
        self.apps.kinds.insert(name.into(), Rc::new(draw));
        Ok(self)
    }

    /// The kit with `make` for the island `name`: one instance per block, kept until the block goes.
    #[must_use]
    pub fn island<I: Island + 'static>(mut self, name: &str, make: impl Fn() -> Box<I> + 'static) -> Self {
        self.apps
            .islands
            .insert(name.into(), Rc::new(move || -> Box<dyn Island> { make() }));
        self
    }

    /// The kit with `wrap` around every drawn block of `kind`, core or the app's.
    #[must_use]
    pub fn wrap(mut self, kind: &str, wrap: impl Fn(&mut Ui, &Styled<'_>, &mut dyn FnMut(&mut Ui)) + 'static) -> Self {
        self.apps.wraps.insert(kind.into(), Rc::new(wrap));
        self
    }
}

struct Held {
    block: Block,
    built: Built,
    plan: Node,
    local: Local,
}

/// One screen on this client: the screen, its local state and what the last pass drew.
#[derive(Default)]
pub struct Stage {
    held: Option<Held>,
    state: State,
    drawn: Option<Drawn>,
    islands: Live,
}

fn ids(n: &Node, out: &mut std::collections::BTreeSet<String>) {
    out.extend(n.id.clone());
    n.children.iter().for_each(|c| ids(c, out));
}

fn local(built: &Built, state: &State) -> Local {
    let v = view(built, state);
    let mut values: std::collections::BTreeMap<_, _> = state
        .iter()
        .filter_map(|(k, l)| match l {
            Lit::Str(s) => Some((k.clone(), s.clone())),
            _ => None,
        })
        .collect();
    values.extend(v.values);
    let held = state
        .iter()
        .map(|(k, l)| (k.clone(), serde_json::to_value(l).unwrap_or_default()))
        .collect();
    Local {
        values,
        off: v.disabled,
        acts: v.acts,
        held,
        hidden: v.hidden,
        says: v.says,
    }
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
        let local = local(&built, &self.state);
        if !self.islands.is_empty() {
            let mut kept = std::collections::BTreeSet::new();
            ids(&plan, &mut kept);
            self.islands.retain(|k, _| kept.contains(k));
        }
        self.held = Some(Held {
            block: b.clone(),
            built,
            plan,
            local,
        });
    }

    /// One pass: draws the screen into `ui` and gives back what the user did.
    pub fn show(&mut self, ui: &mut Ui, kit: &Kit, unix_now: f64) -> Vec<Event> {
        let Some(h) = &self.held else { return vec![] };
        ui.painter().rect_filled(ui.max_rect(), 0.0, kit.look.bg(ui));
        let mut rec = Rec::default();
        rec.islands = std::mem::take(&mut self.islands);
        let ground = Ground {
            look: &kit.look,
            art: kit.art.as_ref(),
            apps: &kit.apps,
            local: &h.local,
            now: unix_now,
        };
        let mut cx = Cx::new(ground, &mut rec, std::slice::from_ref(&h.plan));
        Frame::new().inner_margin(kit.look.margin()).show(ui, |ui| {
            kit.look.dress(ui);
            cx.block(ui, &h.block);
        });
        let tree = cx.done().into_iter().next();
        self.islands = std::mem::take(&mut rec.islands);
        let (drawn, did) = rec.done(tree.unwrap_or_else(|| h.plan.clone()));
        let screen = h.block.id().unwrap_or_default().to_owned();
        self.drawn = Some(drawn);
        let mut out = vec![];
        let mut changed = false;
        for d in did {
            match d {
                Did::Event(Event::Act(mut a)) => {
                    a.screen.clone_from(&screen);
                    out.push(Event::Act(a));
                }
                Did::Event(e) => out.push(e),
                Did::Set(sets) => {
                    for s in sets {
                        let to = eval(&s.to, &self.state);
                        self.state.insert(s.key, to);
                    }
                    changed = true;
                }
                Did::Pick(name, value) => {
                    self.state.insert(name, lit(&Value::Null, &value));
                    changed = true;
                }
            }
        }
        if let Some(h) = self.held.as_mut().filter(|_| changed) {
            h.plan = expect(&h.built, &kinds(), &self.state);
            h.local = local(&h.built, &self.state);
            ui.ctx().request_repaint();
        }
        out
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
