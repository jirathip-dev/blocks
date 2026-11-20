use serde_json::Value;

use super::write::{get, list, W};

mod fallback;
mod marks;
use fallback::fallback_as;

macro_rules! kinds {
    ($($name:literal => $m:ident,)*) => {
        $(mod $m;)*
        pub(super) fn block(w: &mut W<'_>, b: &Value) {
            match get(b, "type").unwrap_or_default() {
                $($name => $m::draw(w, b),)*
                _ => fallback(w, b),
            }
        }
    };
}

include!("drawn.rs");

pub(crate) fn kids(w: &mut W<'_>, bs: &[Value]) {
    for b in bs.iter().filter(|b| b.is_object()) {
        block(w, b);
    }
}

fn holder(w: &mut W<'_>, b: &Value, tag: &str, cls: &str, under: &str) {
    w.open_block(tag, cls, b, &[]);
    kids(w, list(b, under));
    w.close(tag);
}

pub(crate) fn fallback(w: &mut W<'_>, b: &Value) {
    fallback_as(w, b, "div", &[]);
}
