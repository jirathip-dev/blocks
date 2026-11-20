use std::collections::{BTreeMap, BTreeSet};

use blocks::tree::{Drawn as Way, Node};
use blocks::Block;
use egui::accesskit::Role;
use egui::{Ui, UiBuilder};
use serde_json::Value;

use crate::art::Art;
use crate::draw;
use crate::drawn::{spot, Rec};
use crate::island::{tone, Apps, Styled};
use crate::look::Look;

pub(crate) type Draw<T> = fn(&T, &mut Ui, &mut Cx<'_>);

#[derive(Default)]
pub(crate) struct Local {
    pub(crate) values: BTreeMap<String, String>,
    pub(crate) off: BTreeSet<String>,
    pub(crate) acts: BTreeSet<String>,
    pub(crate) held: BTreeMap<String, Value>,
    pub(crate) hidden: BTreeSet<String>,
    pub(crate) says: BTreeMap<String, String>,
}

#[derive(Clone, Copy)]
pub(crate) struct Ground<'a> {
    pub(crate) look: &'a Look,
    pub(crate) art: &'a dyn Art,
    pub(crate) apps: &'a Apps,
    pub(crate) local: &'a Local,
    pub(crate) now: f64,
}

pub(crate) struct Cx<'a> {
    pub(crate) look: &'a Look,
    pub(crate) art: &'a dyn Art,
    pub(crate) apps: &'a Apps,
    pub(crate) now: f64,
    pub(crate) rec: &'a mut Rec,
    pub(crate) me: Option<&'a str>,
    pub(crate) on: bool,
    pub(crate) up: bool,
    local: &'a Local,
    plan: &'a [Node],
    next: usize,
    out: Vec<Node>,
}

fn role(r: &str) -> Role {
    match r {
        "region" => Role::Region,
        "form" => Role::Form,
        "navigation" => Role::Navigation,
        "link" => Role::Link,
        "button" => Role::Button,
        _ => Role::Group,
    }
}

fn stray(b: &Block) -> Node {
    Node {
        kind: b.kind().into(),
        id: b.id().map(Into::into),
        variant: None,
        drawn: Way::Fallback,
        role: "group".into(),
        name: b.kind().into(),
        rect: None,
        text: None,
        fields: None,
        children: vec![],
    }
}

impl<'a> Cx<'a> {
    pub(crate) fn new(g: Ground<'a>, rec: &'a mut Rec, plan: &'a [Node]) -> Self {
        Self {
            look: g.look,
            art: g.art,
            apps: g.apps,
            now: g.now,
            rec,
            me: None,
            on: true,
            up: true,
            local: g.local,
            plan,
            next: 0,
            out: vec![],
        }
    }

    pub(crate) fn done(self) -> Vec<Node> {
        self.out
    }

    fn ground(&self) -> Ground<'a> {
        Ground {
            look: self.look,
            art: self.art,
            apps: self.apps,
            local: self.local,
            now: self.now,
        }
    }

    pub(crate) fn value(&self, key: &str) -> Option<&'a str> {
        self.local.values.get(key).map(String::as_str)
    }

    pub(crate) fn values(&self) -> &'a BTreeMap<String, String> {
        &self.local.values
    }

    pub(crate) fn held(&self, key: &str) -> Option<&'a Value> {
        self.local.held.get(key)
    }

    pub(crate) fn hidden(&self, key: &str) -> bool {
        self.local.hidden.contains(key)
    }

    pub(crate) fn off(&self, key: &str) -> bool {
        self.local.off.contains(key)
    }

    pub(crate) fn say(&self, key: &str) -> Option<&'a str> {
        self.local.says.get(key).map(String::as_str)
    }

    pub(crate) fn act_on(&self, action: Option<&str>) -> bool {
        self.on && !action.is_some_and(|a| self.local.acts.contains(a))
    }

    pub(crate) fn blocks(&mut self, ui: &mut Ui, blocks: &[Block]) {
        for b in blocks {
            self.block(ui, b);
        }
    }

    pub(crate) fn block(&mut self, ui: &mut Ui, b: &Block) {
        let at = self.next;
        self.next += 1;
        let plans = self.plan;
        let Some(plan) = plans.get(at) else {
            self.out.push(stray(b));
            return;
        };
        if plan.drawn == Way::Hidden {
            self.out.push(plan.clone());
            return;
        }
        if let Some(id) = b.id() {
            self.rec.enter(id);
        }
        let salt = b.id().map_or_else(|| format!("#{at}"), |id| format!("block:{id}"));
        let builder = UiBuilder::new()
            .id_salt(salt)
            .accessibility_role(role(&plan.role))
            .accessibility_label(plan.name.clone());
        let on = self.on && !b.id().is_some_and(|id| self.local.off.contains(id));
        let mut inner = Cx::new(self.ground(), self.rec, &plan.children);
        inner.me = plan.id.as_deref();
        inner.on = on;
        inner.up = self.on;
        let r = ui.scope_builder(builder, |ui| {
            if let Some(id) = b.id() {
                let author = format!("block:{id}");
                ui.ctx()
                    .accesskit_node_builder(ui.unique_id(), |n| n.set_author_id(author));
            }
            let Some(wrap) = self.apps.wraps.get(b.kind()) else {
                return draw::draw(b, &plan.name, ui, &mut inner);
            };
            let styled = Styled {
                kind: b.kind(),
                id: b.id(),
                variant: plan.variant.as_deref(),
                tone: tone(b),
                fallback: plan.drawn == Way::Fallback,
            };
            let mut way = Way::Fallback;
            wrap(ui, &styled, &mut |ui| way = draw::draw(b, &plan.name, ui, &mut inner));
            way
        });
        let children = inner.done();
        let rect = spot(r.response.rect);
        if let Some(id) = b.id() {
            self.rec.hit(id, rect, on);
        }
        self.out.push(Node {
            kind: b.kind().into(),
            id: b.id().map(Into::into),
            variant: plan.variant.clone(),
            drawn: r.inner,
            role: plan.role.clone(),
            name: plan.name.clone(),
            rect: Some(rect),
            text: None,
            fields: None,
            children,
        });
    }
}
