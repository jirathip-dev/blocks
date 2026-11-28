use serde_json::Value;

use super::form::form_of;
use crate::site::write::W;

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    form_of(w, b, "form cfg as-surface", true);
}
