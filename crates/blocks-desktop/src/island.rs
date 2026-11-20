use std::collections::BTreeMap;
use std::rc::Rc;

use blocks::{Action, AppBlock, Block, Fields, Island as Hosted, Tone};
use egui::{Ui, Vec2};

use crate::act::{Did, Event};
use crate::cx::Cx;
use crate::drawn::Rec;
use crate::fallback;

/// A client component an app hosts: drawn from its props in its reserved box, its named events sent out.
pub trait Island {
    fn show(&mut self, ui: &mut Ui, props: &Fields, out: &mut Out<'_>);
}

/// Where an app kind or an island sends: an action when the name is one of the block's `events`, else dropped.
pub struct Out<'a> {
    rec: &'a mut Rec,
    block: Option<&'a str>,
    events: &'a [String],
}

impl Out<'_> {
    /// Sends the event `name` with `values`.
    pub fn send(&mut self, name: &str, values: Fields) {
        let e = if self.events.iter().any(|e| e == name) {
            Event::Act(Action {
                screen: String::new(),
                block: self.block.map(Into::into),
                action: name.into(),
                values,
            })
        } else {
            Event::Dropped(format!("event {} {name}", self.block.unwrap_or_default()))
        };
        self.rec.did(Did::Event(e));
    }
}

/// What an app's wrap of a kind is told about the block it wraps.
#[derive(Clone, Debug, PartialEq)]
pub struct Styled<'a> {
    pub kind: &'a str,
    pub id: Option<&'a str>,
    pub variant: Option<&'a str>,
    pub tone: Option<Tone>,
    pub fallback: bool,
}

pub(crate) type View = Rc<dyn Fn(&mut Ui, &AppBlock, &mut Out<'_>)>;
pub(crate) type Make = Rc<dyn Fn() -> Box<dyn Island>>;
pub(crate) type Wrap = Rc<dyn Fn(&mut Ui, &Styled<'_>, &mut dyn FnMut(&mut Ui))>;
pub(crate) type Live = BTreeMap<String, Box<dyn Island>>;

#[derive(Clone, Default)]
pub(crate) struct Apps {
    pub(crate) kinds: BTreeMap<String, View>,
    pub(crate) islands: BTreeMap<String, Make>,
    pub(crate) wraps: BTreeMap<String, Wrap>,
}

pub(crate) fn tone(b: &Block) -> Option<Tone> {
    match b {
        Block::Card(c) => c.tone.clone(),
        Block::Stat(s) => s.tone.clone(),
        Block::Text(t) => t.tone.clone(),
        Block::Toast(t) => t.tone.clone(),
        _ => None,
    }
}

fn events(f: &Fields) -> Vec<String> {
    f.get("events")
        .and_then(|e| serde_json::from_value(e.clone()).ok())
        .unwrap_or_default()
}

pub(crate) fn app(a: &AppBlock, b: &Block, name: &str, ui: &mut Ui, cx: &mut Cx<'_>) {
    let Some(view) = cx.apps.kinds.get(&a.kind) else {
        return fallback::draw(b, name, ui, cx);
    };
    let events = events(&a.more);
    let mut out = Out {
        rec: cx.rec,
        block: a.id.as_deref(),
        events: &events,
    };
    let r = ui.add_enabled_ui(cx.on, |ui| view(ui, a, &mut out));
    if let Some(id) = &a.id {
        cx.rec.tap(id, r.response.rect, cx.on);
    }
}

fn reserved(x: &Hosted, ui: &Ui) -> Vec2 {
    let size = x.size.as_ref();
    let free = ui.available_width();
    let width = size
        .and_then(|s| s.width)
        .map_or(free, |w| free.min(f32::from(u16::try_from(w).unwrap_or(u16::MAX))));
    let tall = size
        .and_then(|s| s.height)
        .map(|h| f32::from(u16::try_from(h).unwrap_or(u16::MAX)));
    let ratio = size.and_then(|s| s.aspect.as_deref()).and_then(|a| {
        let (w, h) = a.split_once(['/', ':'])?;
        Some(w.trim().parse::<f32>().ok()? / h.trim().parse::<f32>().ok()?)
    });
    Vec2::new(width, tall.or(ratio.map(|r| width / r)).unwrap_or(0.0))
}

pub(crate) fn island(x: &Hosted, b: &Block, name: &str, ui: &mut Ui, cx: &mut Cx<'_>) {
    let Some(make) = cx.apps.islands.get(&x.name) else {
        return fallback::draw(b, name, ui, cx);
    };
    let key = x.id.clone().unwrap_or_else(|| x.name.clone());
    let mut live = cx.rec.islands.remove(&key).unwrap_or_else(|| make());
    let props = x.props.clone().unwrap_or_default();
    let events = x.events.as_deref().unwrap_or_default();
    let size = reserved(x, ui);
    let on = cx.on;
    let r = ui.allocate_ui(size, |ui| {
        ui.set_min_size(size);
        let mut out = Out {
            rec: cx.rec,
            block: x.id.as_deref(),
            events,
        };
        ui.add_enabled_ui(on, |ui| live.show(ui, &props, &mut out));
    });
    if let Some(id) = &x.id {
        cx.rec.tap(id, r.response.rect, on);
    }
    cx.rec.islands.insert(key, live);
}
