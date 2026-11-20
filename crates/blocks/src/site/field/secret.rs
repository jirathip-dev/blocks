use serde_json::Value;

use crate::site::write::{get, on, W};

pub(super) fn view(w: &mut W<'_>, x: &Value, attrs: &[(&str, &str)]) {
    let hint = match (on(x, "set"), get(x, "placeholder")) {
        (true, _) => w.locale.word("set"),
        (false, Some(p)) => p,
        (false, None) => w.locale.word("unset"),
    };
    super::plain::input(w, x, attrs, true, hint);
}
