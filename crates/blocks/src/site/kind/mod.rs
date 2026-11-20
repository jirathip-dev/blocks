use serde_json::Value;

use super::write::{get, list, W};

mod fallback;
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

kinds! {
    "screen" => screen,
    "sheet" => sheet,
    "list" => list,
    "section" => section,
    "row" => row,
    "card" => card,
    "choice" => choice,
    "form" => form,
    "config" => config,
    "secret" => secret,
    "run" => run,
    "button" => button,
    "chips" => chips,
    "stat" => stat,
    "text" => text,
    "images" => images,
    "web" => web,
    "composer" => composer,
    "prose" => prose,
    "hero" => hero,
    "media" => media,
    "nav" => nav,
    "diagram" => diagram,
    "chart" => chart,
    "diff" => diff,
    "editor" => editor,
    "lines" => lines,
    "scene" => scene,
    "island" => island,
    "table" => table,
    "steps" => steps,
    "toast" => toast,
    "timeline" => timeline,
}

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
