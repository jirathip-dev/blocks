use std::collections::{BTreeMap, HashSet};

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

const NAV: Component = Component {
    kind: "nav",
    slots: &["side", "main", "menu"],
    config: &[],
};
const MAX_BYTES: usize = 64 * 1024;
const MAX_DEPTH: usize = 6;
const MAX_NODES: usize = 200;

/// The owner's `layout.json`, checked against an app's `Contract`.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct Layout {
    pub format: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub theme: Option<String>,
    pub root: Node,
}

/// One node of the tree: placed per size class as checked, by one `Place` once resolved.
#[derive(Debug, Clone, PartialEq)]
pub struct Node<P = Placement> {
    pub id: String,
    pub content: Content,
    pub label: Option<String>,
    pub place: P,
    pub transition: Transition,
    pub config: Map<String, Value>,
    pub slots: BTreeMap<String, Vec<Node<P>>>,
}

/// The tree with one `Place` per node, which is all a shell reads.
pub type Resolved = Node<Place>;

/// What a node draws: a screen of blocks from a source, or a component.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Content {
    Screen { source: String, path: String },
    Component { kind: String },
}

/// A node's place on each size class; a size the file leaves out inherits the other.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub struct Placement {
    pub compact: Place,
    pub wide: Place,
}

/// How a node shows once its size class is known.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema), schemars(rename = "LayoutPlace"))]
#[serde(rename_all = "lowercase")]
pub enum Place {
    Push,
    Sheet,
    Panel,
    Column,
    Strip,
    Cards,
    Menu,
    Inline,
    Hidden,
}

/// How a node comes on screen and goes; `push` when the file names none.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[cfg_attr(feature = "schema", schemars(rename = "LayoutTransition"))]
#[serde(rename_all = "lowercase")]
pub enum Transition {
    #[default]
    Push,
    Sheet,
    Fade,
    None,
}

/// The two widths a layout places for: iPhone is `Compact`, iPad and Mac are `Wide`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SizeClass {
    Compact,
    Wide,
}

/// The app's part: its components beside `nav`, and the screens no file may place, replace or hide.
#[derive(Debug, Clone, Copy)]
pub struct Contract {
    pub components: &'static [Component],
    pub locked: &'static [&'static str],
}

/// A component an app draws: the slots it holds and the config keys it reads.
#[derive(Debug, Clone, Copy)]
pub struct Component {
    pub kind: &'static str,
    pub slots: &'static [&'static str],
    pub config: &'static [&'static str],
}

/// Where a plugin's manifest asks to be placed.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PlaceKind {
    HeaderStrip,
    ChatCards,
    MenuRow,
}

/// A plugin's manifest places: merged into the layout unless the owner's file already places that plugin.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PlaceEntry {
    pub kind: PlaceKind,
    pub source: String,
    pub id: String,
    pub label: Option<String>,
    pub screen: String,
}

/// Why a layout was refused, and where: `line` and `col` count from 1.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Broken {
    pub line: usize,
    pub col: usize,
    pub why: String,
}

type Fault = (String, String, usize);

impl Contract {
    fn component(&self, kind: &str) -> Option<&Component> {
        if kind == NAV.kind {
            return Some(&NAV);
        }
        self.components.iter().find(|c| c.kind == kind)
    }

    fn holds(&self, n: &Node, slot: &str) -> bool {
        matches!(&n.content, Content::Component { kind } if self.component(kind).is_some_and(|c| c.slots.contains(&slot)))
    }
}

impl Placement {
    /// The place on one size class.
    pub fn on(self, size: SizeClass) -> Place {
        match size {
            SizeClass::Compact => self.compact,
            SizeClass::Wide => self.wide,
        }
    }
}

impl PlaceKind {
    fn slot(self) -> (&'static str, Place) {
        match self {
            Self::HeaderStrip => ("strip", Place::Strip),
            Self::ChatCards => ("cards", Place::Cards),
            Self::MenuRow => ("menu", Place::Menu),
        }
    }
}

impl Node {
    fn resolved(&self, size: SizeClass) -> Resolved {
        Node {
            id: self.id.clone(),
            content: self.content.clone(),
            label: self.label.clone(),
            place: self.place.on(size),
            transition: self.transition,
            config: self.config.clone(),
            slots: self
                .slots
                .iter()
                .map(|(k, v)| (k.clone(), v.iter().map(|n| n.resolved(size)).collect()))
                .collect(),
        }
    }

    fn walk<'a>(&'a self, out: &mut Vec<&'a Self>) {
        out.push(self);
        self.slots.values().flatten().for_each(|n| n.walk(out));
    }
}

impl Layout {
    /// The tree with one place per node for `size`.
    pub fn resolved(&self, size: SizeClass) -> Resolved {
        self.root.resolved(size)
    }
}

impl<P: Serialize> Serialize for Node<P> {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        #[derive(Serialize)]
        struct Wire<'a, P> {
            #[serde(rename = "type")]
            kind: &'a str,
            id: &'a str,
            #[serde(skip_serializing_if = "Option::is_none")]
            source: Option<&'a str>,
            #[serde(skip_serializing_if = "Option::is_none")]
            path: Option<&'a str>,
            #[serde(skip_serializing_if = "Option::is_none")]
            label: Option<&'a str>,
            place: &'a P,
            transition: Transition,
            #[serde(skip_serializing_if = "Option::is_none")]
            config: Option<&'a Map<String, Value>>,
            #[serde(skip_serializing_if = "Option::is_none")]
            slots: Option<&'a BTreeMap<String, Vec<Node<P>>>>,
        }
        let (kind, source, path) = match &self.content {
            Content::Screen { source, path } => ("screen", Some(source.as_str()), Some(path.as_str())),
            Content::Component { kind } => (kind.as_str(), None, None),
        };
        Wire {
            kind,
            id: &self.id,
            source,
            path,
            label: self.label.as_deref(),
            place: &self.place,
            transition: self.transition,
            config: (!self.config.is_empty()).then_some(&self.config),
            slots: (!self.slots.is_empty()).then_some(&self.slots),
        }
        .serialize(s)
    }
}

/// `text` as a layout, refused by the first rule it breaks; a refusal points at the offending text.
pub fn check(text: &str, c: &Contract) -> Result<Layout, Broken> {
    if text.len() > MAX_BYTES {
        return Err(at(text, "", 0, format!("over {MAX_BYTES} bytes")));
    }
    let file: Value = serde_json::from_str(text).map_err(|e| Broken {
        line: e.line(),
        col: e.column().max(1),
        why: "not JSON".into(),
    })?;
    if file.get("format").and_then(Value::as_f64) != Some(1.0) {
        return Err(at(text, "\"format\"", 0, "format: this reader takes 1".into()));
    }
    let root = file.get("root").unwrap_or(&Value::Null);
    if str_at(root, "type") != NAV.kind {
        return Err(at(text, "\"root\"", 0, "root: not a nav".into()));
    }
    let mut reader = Reader {
        c,
        ids: HashSet::new(),
        count: 0,
    };
    let root = reader
        .node(root, "root", 1)
        .map_err(|(why, bad, nth)| at(text, &bad, nth, why))?;
    if root.place.compact == Place::Hidden || root.place.wide == Place::Hidden {
        return Err(at(text, "\"root\"", 0, "root: may not be hidden".into()));
    }
    Ok(Layout {
        format: 1,
        theme: file.get("theme").and_then(Value::as_str).map(str::to_owned),
        root,
    })
}

fn at(text: &str, needle: &str, nth: usize, why: String) -> Broken {
    let i = text.match_indices(needle).nth(nth).map_or(0, |(i, _)| i);
    let before = text.get(..i).unwrap_or_default();
    let line_start = before.rfind('\n').map_or(0, |n| n + 1);
    Broken {
        line: before.matches('\n').count() + 1,
        col: before.len() - line_start + 1,
        why,
    }
}

fn str_at<'a>(n: &'a Value, key: &str) -> &'a str {
    n.get(key).and_then(Value::as_str).unwrap_or_default()
}

fn word<T: for<'de> Deserialize<'de>>(s: &str) -> Option<T> {
    serde_json::from_value(Value::String(s.into())).ok()
}

struct Reader<'c> {
    c: &'c Contract,
    ids: HashSet<String>,
    count: usize,
}

impl Reader<'_> {
    fn node(&mut self, n: &Value, path: &str, depth: usize) -> Result<Node, Fault> {
        let fail = |what: &str, bad: &str| (format!("{path}: {what} \"{bad}\""), format!("\"{bad}\""), 0);
        if depth > MAX_DEPTH {
            return Err((format!("{path}: over {MAX_DEPTH} deep"), "\"type\"".into(), 0));
        }
        self.count += 1;
        if self.count > MAX_NODES {
            return Err((format!("over {MAX_NODES} nodes"), "\"type\"".into(), 0));
        }
        let kind = str_at(n, "type");
        let (source, screen) = (str_at(n, "source"), str_at(n, "path"));
        let (content, component) = if kind == "screen" {
            if source.is_empty() || !screen.starts_with("/screens/") {
                return Err(fail("a screen needs a source and a path under /screens/, not", screen));
            }
            if self.c.locked.contains(&screen) {
                return Err(fail("a locked screen can't be placed:", screen));
            }
            let content = Content::Screen {
                source: source.into(),
                path: screen.into(),
            };
            (content, None)
        } else {
            let component = self.c.component(kind).ok_or_else(|| fail("unknown type", kind))?;
            (Content::Component { kind: kind.into() }, Some(component))
        };
        let id = n.get("id").and_then(Value::as_str).map_or_else(
            || match &content {
                Content::Screen { .. } => format!("{source}:{screen}"),
                Content::Component { .. } => kind.to_owned(),
            },
            str::to_owned,
        );
        if !self.ids.insert(id.clone()) {
            return Err((format!("{path}: id \"{id}\" is taken"), format!("\"{id}\""), 1));
        }
        let place = placement(n.get("place")).map_err(|bad| fail("unknown place", bad))?;
        let transition = match n.get("transition") {
            None => Transition::Push,
            Some(t) => {
                let name = t.as_str().unwrap_or_default();
                word(name).ok_or_else(|| fail("unknown transition", name))?
            }
        };
        let config = n.get("config").and_then(Value::as_object).cloned().unwrap_or_default();
        let (slots, keys) = component.map_or((&[][..], &[][..]), |c| (c.slots, c.config));
        if let Some(k) = config.keys().find(|k| !keys.contains(&k.as_str())) {
            return Err(fail("unknown config", k));
        }
        let mut children = BTreeMap::new();
        for (slot, list) in n.get("slots").and_then(Value::as_object).into_iter().flatten() {
            if !slots.contains(&slot.as_str()) {
                return Err(fail("unknown slot", slot));
            }
            let list = list.as_array().into_iter().flatten().enumerate();
            let nodes = list
                .map(|(i, child)| self.node(child, &format!("{path}.slots.{slot}[{i}]"), depth + 1))
                .collect::<Result<Vec<_>, _>>()?;
            children.insert(slot.clone(), nodes);
        }
        Ok(Node {
            id,
            content,
            label: n.get("label").and_then(Value::as_str).map(str::to_owned),
            place,
            transition,
            config,
            slots: children,
        })
    }
}

fn placement(v: Option<&Value>) -> Result<Placement, &str> {
    fn one(p: Option<&str>) -> Result<Place, &str> {
        p.and_then(word).ok_or(p.unwrap_or_default())
    }
    let (compact, wide) = match v {
        None => (Some("inline"), Some("inline")),
        Some(Value::String(s)) => (Some(s.as_str()), Some(s.as_str())),
        Some(sizes) => {
            let compact = sizes.get("compact").and_then(Value::as_str);
            let wide = sizes.get("wide").and_then(Value::as_str);
            (compact.or(wide), wide.or(compact))
        }
    };
    Ok(Placement {
        compact: one(compact)?,
        wide: one(wide)?,
    })
}

/// `places` added to the nodes that hold their slot, for each plugin the layout does not place; the rest, with why.
pub fn merge(mut l: Layout, places: &[PlaceEntry], c: &Contract) -> (Layout, Vec<String>) {
    let mut all = Vec::new();
    l.root.walk(&mut all);
    let sources: HashSet<String> = all
        .iter()
        .filter_map(|n| match &n.content {
            Content::Screen { source, .. } => Some(source.clone()),
            Content::Component { .. } => None,
        })
        .collect();
    let mut ids: HashSet<String> = all.iter().map(|n| n.id.clone()).collect();
    let mut skipped = Vec::new();
    for p in places.iter().filter(|p| !sources.contains(&p.source)) {
        let (slot, place) = p.kind.slot();
        let why = if p.source.is_empty() || !p.screen.starts_with("/screens/") {
            Some("a screen needs a source and a path under /screens/".to_owned())
        } else if c.locked.contains(&p.screen.as_str()) {
            Some("a locked screen can't be placed".to_owned())
        } else if ids.len() >= MAX_NODES {
            Some(format!("over {MAX_NODES} nodes"))
        } else if ids.contains(&p.id) {
            Some(format!("id \"{}\" is taken", p.id))
        } else {
            host(&mut l.root, slot, c, 1).map_or(Some(format!("no node holds a {slot} slot")), |h| {
                let node = Node {
                    id: p.id.clone(),
                    content: Content::Screen {
                        source: p.source.clone(),
                        path: p.screen.clone(),
                    },
                    label: p.label.clone(),
                    place: Placement {
                        compact: place,
                        wide: place,
                    },
                    transition: Transition::Push,
                    config: Map::new(),
                    slots: BTreeMap::new(),
                };
                h.slots.entry(slot.to_owned()).or_default().push(node);
                ids.insert(p.id.clone());
                None
            })
        };
        skipped.extend(why.map(|w| format!("{}: {}: {w}", p.source, p.screen)));
    }
    (l, skipped)
}

fn host<'a>(n: &'a mut Node, slot: &str, c: &Contract, depth: usize) -> Option<&'a mut Node> {
    if depth >= MAX_DEPTH {
        return None;
    }
    if c.holds(n, slot) {
        return Some(n);
    }
    n.slots
        .values_mut()
        .flatten()
        .find_map(|child| host(child, slot, c, depth + 1))
}
