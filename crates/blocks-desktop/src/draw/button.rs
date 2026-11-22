use blocks::Button;
use egui::{Button as Press, Ui};

use crate::bidi;
use crate::act;
use crate::cx::{Cx, Draw};

pub(super) const DRAW: Option<Draw<Button>> = Some(draw);

fn draw(b: &Button, ui: &mut Ui, cx: &mut Cx<'_>) {
    let tap = b.tap.as_ref();
    let action = tap.map_or(b.action.as_deref(), |t| t.action.as_deref());
    if !act::press(ui, cx, action, Press::new(bidi::text(ui, &b.label))) {
        return;
    }
    match (tap, &b.action) {
        (Some(t), _) => act::tap(ui, cx, t),
        (None, Some(a)) => act::send(cx, a, b.values.clone().unwrap_or_default()),
        (None, None) => {}
    }
}
