use serde_json::{Map, Value};

use super::{get, list, Go, W};

fn lane(w: &mut W<'_>, l: &Value) {
    let state = get(l, "state").unwrap_or_default();
    let title = get(l, "title").unwrap_or_default();
    let tap = l.get("tap").filter(|t| !t.is_null());
    let go = match tap {
        Some(t) if get(t, "url").is_none() && get(t, "open").is_none() => Go::Stay,
        t => w.tap(t, None),
    };
    let label = format!("{title}, {state}");
    let mut attrs: Vec<(&str, &str)> = vec![("data-id", get(l, "id").unwrap_or_default()), ("aria-label", &label)];
    let tag = match &go {
        Go::Url(u) => {
            attrs.extend([("href", u.as_str()), ("target", "_blank"), ("rel", "noopener")]);
            "a"
        }
        Go::Open(u) => {
            attrs.push(("href", u.as_str()));
            "a"
        }
        Go::Post(_) | Go::Sheet(_) | Go::Stay => {
            if tap.is_some() {
                attrs.extend([("role", "button"), ("tabindex", "0")]);
            }
            "div"
        }
    };
    let cls = format!("ln {state}{}", if tap.is_some() { " tap" } else { "" });
    w.open("li", "", &[]);
    w.open(tag, &cls, &attrs);
    w.el("i", "lnm", "");
    w.open("span", "lnb", &[]);
    w.open("span", "lnh", &[]);
    w.el("span", "lnt", title);
    w.el("span", "lns", state);
    w.close("span");
    let since = get(l, "since")
        .filter(|s| !s.is_empty())
        .map(|s| Value::Object(Map::from_iter([("since".into(), Value::from(s))])).to_string());
    let meta: Vec<&str> = [get(l, "stage"), get(l, "tool")]
        .into_iter()
        .flatten()
        .filter(|s| !s.is_empty())
        .collect();
    if !meta.is_empty() || since.is_some() {
        w.open("span", "lnx", &[]);
        w.text(&meta.join(" · "));
        if let Some(t) = since {
            w.text(if meta.is_empty() { "" } else { " · " });
            w.open("span", "", &[("data-tick", &t)]);
            w.close("span");
        }
        w.close("span");
    }
    w.close("span");
    w.close(tag);
    w.close("li");
}

pub(super) fn scene(w: &mut W<'_>, b: &Value) {
    w.open_block("div", "scn", b, &[]);
    if let Some(l) = get(b, "label").filter(|l| !l.is_empty()) {
        w.el("div", "sh", l);
    }
    let lanes = list(b, "lanes");
    if !lanes.is_empty() {
        w.open("ul", "scl", &[]);
        for l in lanes {
            lane(w, l);
        }
        w.close("ul");
    }
    w.close("div");
}
