use blocks::{Action, Fields, Set, Tap};
use egui::{Button, OpenUrl, Ui};

use crate::cx::Cx;

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

pub(crate) enum Did {
    Event(Event),
    Set(Vec<Set>),
    Pick(String, String),
}

pub(crate) fn press(ui: &mut Ui, cx: &mut Cx<'_>, action: Option<&str>, b: Button<'_>) -> bool {
    let (key, on) = (cx.me, cx.on);
    press_as(ui, cx, key, on, action, b)
}

pub(crate) fn press_as(
    ui: &mut Ui,
    cx: &mut Cx<'_>,
    key: Option<&str>,
    on: bool,
    action: Option<&str>,
    b: Button<'_>,
) -> bool {
    let r = ui.add_enabled(on, b);
    if let Some(a) = action {
        cx.rec.action(a);
        let author = format!("action:{a}");
        ui.ctx().accesskit_node_builder(r.id, |n| n.set_author_id(author));
    }
    if let Some(k) = key {
        cx.rec.tap(k, r.rect, on);
    }
    r.clicked()
}

pub(crate) fn send(cx: &mut Cx<'_>, action: &str, values: Fields) {
    let block = cx.me.map(Into::into);
    let a = Action {
        screen: String::new(),
        block,
        action: action.into(),
        values,
    };
    cx.rec.did(Did::Event(Event::Act(a)));
}

pub(crate) fn tap(ui: &Ui, cx: &mut Cx<'_>, t: &Tap) {
    if let Some(u) = &t.url {
        ui.ctx().open_url(OpenUrl::new_tab(u));
    }
    if let Some(c) = &t.copy {
        ui.ctx().copy_text(c.clone());
    }
    if let Some(s) = &t.set {
        cx.rec.did(Did::Set(s.clone()));
    }
    let go = [
        t.open.clone().map(Event::Open),
        t.sheet.clone().map(Event::Sheet),
        t.thread.clone().map(Event::Thread),
    ];
    for e in go.into_iter().flatten() {
        cx.rec.did(Did::Event(e));
    }
    if let Some(a) = &t.action {
        send(cx, a, t.values.clone().unwrap_or_default());
    }
}

pub(crate) fn pick(cx: &mut Cx<'_>, name: &str, value: &str) {
    cx.rec.did(Did::Pick(name.into(), value.into()));
}
