use serde_json::Value;

use super::holder;
use crate::site::write::W;

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    holder(w, b, "div", "shb", "blocks");
}
