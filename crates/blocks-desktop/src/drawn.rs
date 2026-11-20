use std::collections::BTreeMap;

use blocks::tree::Node;
use egui::Rect;

use crate::act::Did;

/// What the last pass drew: the tree with rects, the block and action ids in order, and each id's place.
#[derive(Clone, Debug, PartialEq)]
pub struct Drawn {
    pub tree: Node,
    pub blocks: Vec<String>,
    pub actions: Vec<String>,
    pub hits: BTreeMap<String, Hit>,
}

/// Where a block was drawn, as `[x, y, width, height]`: its box, its tap target and its field, and whether it takes input.
#[derive(Clone, Debug, PartialEq)]
pub struct Hit {
    pub rect: [f64; 4],
    pub tap: Option<[f64; 4]>,
    pub field: Option<[f64; 4]>,
    pub live: bool,
}

#[derive(Default)]
pub(crate) struct Rec {
    blocks: Vec<String>,
    actions: Vec<String>,
    hits: BTreeMap<String, Hit>,
    did: Vec<Did>,
}

pub(crate) fn spot(r: Rect) -> [f64; 4] {
    [r.min.x, r.min.y, r.width(), r.height()].map(f64::from)
}

impl Rec {
    pub(crate) fn enter(&mut self, id: &str) {
        self.blocks.push(id.into());
    }

    pub(crate) fn action(&mut self, action: &str) {
        self.actions.push(action.into());
    }

    pub(crate) fn did(&mut self, d: Did) {
        self.did.push(d);
    }

    pub(crate) fn tap(&mut self, key: &str, r: Rect, live: bool) {
        let rect = spot(r);
        let hit = Hit {
            rect,
            tap: Some(rect),
            field: None,
            live,
        };
        self.hits.entry(key.into()).or_insert(hit);
    }

    pub(crate) fn hit(&mut self, id: &str, rect: [f64; 4], live: bool) {
        let tap = self.hits.get(id).and_then(|h| h.tap);
        let hit = Hit {
            rect,
            tap,
            field: None,
            live,
        };
        self.hits.insert(id.into(), hit);
    }

    pub(crate) fn done(self, tree: Node) -> (Drawn, Vec<Did>) {
        let drawn = Drawn {
            tree,
            blocks: self.blocks,
            actions: self.actions,
            hits: self.hits,
        };
        (drawn, self.did)
    }
}
