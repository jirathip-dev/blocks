use blocks::Chips;
use egui::{vec2, Button, Ui};
use serde_json::{Map, Value};

use crate::act;
use crate::cx::{Cx, Draw};

pub(super) const DRAW: Option<Draw<Chips>> = Some(draw);

fn draw(b: &Chips, ui: &mut Ui, cx: &mut Cx<'_>) {
    if b.options.is_empty() {
        ui.allocate_space(vec2(ui.available_width(), ui.spacing().interact_size.y));
    }
    let now = cx.value(&b.name);
    ui.horizontal_wrapped(|ui| {
        for o in &b.options {
            let on = now == Some(o.value.as_str());
            let chip = Button::selectable(on, &o.label);
            if !act::press(ui, cx, b.action.as_deref(), chip) {
                continue;
            }
            act::pick(cx, &b.name, &o.value);
            if let Some(a) = &b.action {
                act::send(cx, a, Map::from_iter([(b.name.clone(), Value::from(vec![o.value.clone()]))]));
            }
        }
    });
}
