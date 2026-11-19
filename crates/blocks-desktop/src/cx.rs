use blocks::tree::{Drawn as Way, Node};
use blocks::Block;
use egui::accesskit::Role;
use egui::{Ui, UiBuilder};

use crate::draw;
use crate::drawn::Rec;
use crate::look::Look;

pub(crate) type Draw<T> = fn(&T, &mut Ui, &mut Cx<'_>);

pub(crate) struct Cx<'a> {
    pub(crate) look: &'a Look,
    rec: &'a mut Rec,
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
        children: vec![],
    }
}

impl<'a> Cx<'a> {
    pub(crate) fn new(look: &'a Look, rec: &'a mut Rec, plan: &'a [Node]) -> Self {
        Self {
            look,
            rec,
            plan,
            next: 0,
            out: vec![],
        }
    }

    pub(crate) fn done(self) -> Vec<Node> {
        self.out
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
        let mut inner = Cx::new(self.look, self.rec, &plan.children);
        let r = ui.scope_builder(builder, |ui| {
            if let Some(id) = b.id() {
                let author = format!("block:{id}");
                ui.ctx()
                    .accesskit_node_builder(ui.unique_id(), |n| n.set_author_id(author));
            }
            draw::draw(b, &plan.name, ui, &mut inner)
        });
        let children = inner.done();
        let r2 = r.response.rect;
        let rect = [r2.min.x, r2.min.y, r2.width(), r2.height()].map(f64::from);
        if let Some(id) = b.id() {
            self.rec.hit(id, rect);
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
            children,
        });
    }
}
