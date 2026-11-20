use blocks::{Run, Time};
use egui::{Button, RichText, Ui};
use serde_json::{Map, Value};

use crate::act;
use crate::cx::{Cx, Draw};
use crate::text::age;

pub(super) const DRAW: Option<Draw<Run>> = Some(draw);

fn draw(b: &Run, ui: &mut Ui, cx: &mut Cx<'_>) {
    let look = cx.look;
    ui.label(RichText::new(&b.command).monospace().color(look.fg(ui)));
    let sha = format!("sha {}", b.sha);
    let meta: Vec<&str> = [b.dir.as_deref(), b.touches.as_deref(), Some(&sha)].into_iter().flatten().collect();
    ui.label(RichText::new(meta.join(" · ")).color(look.mute(ui)));
    if let Some(until) = &b.until {
        let t = Time {
            until: Some(until.clone()),
            label: Some("lapses in {rel}".into()),
            since: None,
        };
        ui.label(RichText::new(age(&t, cx.now)).color(look.mute(ui)));
    }
    ui.horizontal(|ui| {
        for choice in ["approve", "deny"] {
            if act::press(ui, cx, Some(&b.action), Button::new(choice)) {
                let values = Map::from_iter([("choice".into(), Value::from(choice)), ("sha".into(), b.sha.clone().into())]);
                act::send(cx, &b.action, values);
            }
        }
    });
}
