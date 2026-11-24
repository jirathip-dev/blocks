use serde_json::{Map, Value};

use super::{classes, face};
use crate::site::kind::kids;
use crate::site::write::{get, list, sends, shown, Go, W};

fn body(w: &mut W<'_>, d: &Value, state: &str) {
    let lane = d.get("lane").filter(|l| l.is_object());
    let blocks = list(d, "blocks");
    let links = list(d, "links");
    if lane.is_none() && blocks.is_empty() && links.is_empty() {
        return;
    }
    w.open("div", "rdb", &[]);
    if let Some(l) = lane {
        let head: Vec<&str> = ["name", "harness", "model", "host"]
            .into_iter()
            .filter_map(|k| get(l, k).filter(|s| !s.is_empty()))
            .collect();
        w.el("div", "rdh", &head.join(" · "));
        w.open("div", "rdo", &[]);
        let log = list(l, "lines");
        for (i, t) in log.iter().enumerate() {
            if state == "working" && i + 1 == log.len() {
                w.el("div", "live", &format!("▍ {}", shown(Some(t))));
            } else {
                w.el("div", "", &shown(Some(t)));
            }
        }
        w.close("div");
    }
    kids(w, blocks);
    if !links.is_empty() {
        w.open("div", "rdk", &[]);
        for k in links {
            let go = w.tap(k.get("tap"), None);
            w.btn(&shown(k.get("label")), "", &go, &[], None);
        }
        w.close("div");
    }
    w.close("div");
}

fn round(w: &mut W<'_>, d: &Value, now: bool) {
    let state = get(d, "state").unwrap_or_default();
    let tap = d.get("tap").filter(|t| !now && !t.is_null());
    let go = match tap {
        Some(t) if get(t, "url").is_none() && get(t, "open").is_none() => Go::Stay,
        t => w.tap(t, None),
    };
    w.open("li", &format!("rd {state}{}", if now { " now" } else { "" }), &[]);
    w.open("i", "rdm", &[("aria-label", state)]);
    w.close("i");
    w.open("div", "rdx", &[]);
    let cls = if tap.is_some() { "rdl tap" } else { "rdl" };
    let tag = match &go {
        Go::Url(u) => {
            w.open("a", cls, &[("href", u), ("target", "_blank"), ("rel", "noopener")]);
            "a"
        }
        Go::Open(u) => {
            w.open("a", cls, &[("href", u)]);
            "a"
        }
        Go::Post(..) | Go::Sheet(_) | Go::Copy(_) | Go::Stay if tap.is_some() => {
            let mut at = vec![("tabindex", "0"), ("role", "button")];
            at.extend(sends(tap).map(|a| ("data-action", a)));
            w.open("div", cls, &at);
            "div"
        }
        Go::Post(..) | Go::Sheet(_) | Go::Copy(_) | Go::Stay => {
            w.open("div", cls, &[]);
            "div"
        }
    };
    w.el("span", "rdn", &shown(d.get("name")));
    w.el("span", "rdu", &shown(d.get("summary")));
    if let Some(s) = get(d, "since").filter(|s| !s.is_empty()) {
        let t = Value::Object(Map::from_iter([("since".into(), Value::from(s))])).to_string();
        w.open("span", "rdt", &[]);
        w.open("span", "", &[("data-tick", &t)]);
        w.close("span");
        w.close("span");
    }
    if tap.is_some() {
        w.el("span", "rc", "›");
    }
    w.close(tag);
    if now {
        body(w, d, state);
    }
    w.close("div");
    w.close("li");
}

pub(super) fn row(w: &mut W<'_>, b: &Value) {
    let rounds = list(b, "rounds");
    let open = rounds.last().and_then(|d| get(d, "state")) == Some("needs");
    w.open_block("div", if open { "rr open" } else { "rr" }, b, &[]);
    let at = [
        ("data-id", get(b, "id").unwrap_or_default()),
        ("tabindex", "0"),
        ("role", "button"),
        ("aria-expanded", if open { "true" } else { "false" }),
    ];
    w.open("div", &format!("{} tap", classes(b)), &at);
    face(w, b, !open);
    w.el("span", "rc", "›");
    w.close("div");
    if open {
        w.open("ol", "rds", &[]);
        for (i, d) in rounds.iter().enumerate() {
            round(w, d, i + 1 == rounds.len());
        }
        w.close("ol");
    }
    w.close("div");
}
