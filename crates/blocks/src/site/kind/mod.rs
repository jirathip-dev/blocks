use serde_json::Value;

use super::write::{get, W};

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
    kids_of(w, bs, false);
}

fn kids_of(w: &mut W<'_>, bs: &[Value], listed: bool) {
    let mut was: Option<&Value> = None;
    for b in bs.iter().filter(|b| b.is_object()) {
        w.listed = listed;
        let same = |k: &str| was.and_then(|a| get(a, k)) == get(b, k);
        if get(b, "type") == Some("message") && same("type") && same("role") && same("name") {
            message::said(w, b, true);
        } else {
            block(w, b);
        }
        was = Some(b);
    }
}

pub(crate) fn fallback(w: &mut W<'_>, b: &Value) {
    fallback_as(w, b, "div", &[]);
}
