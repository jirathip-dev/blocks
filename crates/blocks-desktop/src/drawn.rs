use std::collections::BTreeMap;

use blocks::tree::Node;

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
    hits: BTreeMap<String, Hit>,
}

impl Rec {
    pub(crate) fn enter(&mut self, id: &str) {
        self.blocks.push(id.into());
    }

    pub(crate) fn hit(&mut self, id: &str, rect: [f64; 4]) {
        let hit = Hit {
            rect,
            tap: None,
            field: None,
            live: true,
        };
        self.hits.insert(id.into(), hit);
    }

    pub(crate) fn done(self, tree: Node) -> Drawn {
        Drawn {
            tree,
            blocks: self.blocks,
            actions: vec![],
            hits: self.hits,
        }
    }
}
