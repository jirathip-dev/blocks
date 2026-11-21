use serde_json::Value;

use crate::site::write::W;

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    super::modal::draw(w, b);
}
