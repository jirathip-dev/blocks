use serde_json::Value;

use super::fallback;
use crate::site::write::{get, list, sends, Go, W};

fn step(w: &mut W<'_>, s: &Value, i: usize, n: usize, at: usize) {
    let label = get(s, "label").unwrap_or_default();
    let (state, word) = match i.cmp(&at) {
        std::cmp::Ordering::Less => ("done", "done"),
        std::cmp::Ordering::Equal => ("now", "current"),
        std::cmp::Ordering::Greater => ("todo", "to do"),
    };
    let tap = s.get("tap").filter(|t| state == "done" && !t.is_null());
    let go = match tap {
        Some(t) if get(t, "url").is_none() && get(t, "open").is_none() => Go::Stay,
        t => w.tap(t, None),
    };
    let name = format!("{label}, step {} of {n}, {word}", i + 1);
    let mut attrs: Vec<(&str, &str)> = vec![("aria-label", &name), ("title", label)];
    let tag = match &go {
        Go::Url(u) => {
            attrs.extend([("href", u.as_str()), ("target", "_blank"), ("rel", "noopener")]);
            "a"
        }
        Go::Open(u) => {
            attrs.push(("href", u.as_str()));
            "a"
        }
        Go::Post(..) | Go::Sheet(_) | Go::Stay => {
            if tap.is_some() {
                attrs.extend([("role", "button"), ("tabindex", "0")]);
                attrs.extend(sends(tap).map(|a| ("data-action", a)));
            }
            "div"
        }
    };
    w.open(
        "li",
        &format!("spi {state}"),
        if i == at { &[("aria-current", "step")] } else { &[] },
    );
    w.open(tag, if tap.is_some() { "spc tap" } else { "spc" }, &attrs);
    w.open("span", "spr", &[("aria-hidden", "true")]);
    w.el("i", "spm", &if i < at { "✓".into() } else { (i + 1).to_string() });
    w.el("span", "spk", "");
    w.close("span");
    w.el("span", "spn", label);
    let sub = get(s, "sub").filter(|x| !x.is_empty()).map(String::from);
    if let Some(x) = sub.or_else(|| (i == at).then(|| format!("step {} of {n}", i + 1))) {
        w.el("span", "sps", &x);
    }
    w.close(tag);
    w.close("li");
}

fn stepper(w: &mut W<'_>, b: &Value, steps: &[Value], at: usize) {
    let n = steps.len();
    w.open_block("div", "sp", b, &[]);
    if let Some(t) = get(b, "title").filter(|t| !t.is_empty()) {
        w.el("div", "sh", t);
    }
    w.open("ol", "spl", &[]);
    for (i, s) in steps.iter().enumerate() {
        step(w, s, i, n, at);
    }
    w.close("ol");
    w.open("div", "spx", &[("aria-hidden", "true")]);
    if let Some(s) = steps.get(at) {
        w.el("b", "", get(s, "label").unwrap_or_default());
        let sub = get(s, "sub").filter(|x| !x.is_empty());
        let more = sub.map(|x| format!(" · {x}")).unwrap_or_default();
        w.el("span", "m", &format!("step {} of {n}{more}", at + 1));
    } else {
        w.el("b", "", "All done");
        w.el("span", "m", &format!("{n} of {n}"));
    }
    w.close("div");
    w.close("div");
}

fn bar(w: &mut W<'_>, r: &Value) {
    let v = r.get("value").and_then(Value::as_u64).unwrap_or_default().min(100);
    let label = get(r, "label").unwrap_or_default();
    let sub = get(r, "sub").filter(|s| !s.is_empty());
    let cls = format!(
        "pgr{}{}",
        get(r, "tone").map(|t| format!(" {t}")).unwrap_or_default(),
        if v == 0 { " zero" } else { "" }
    );
    let (now, text) = (v.to_string(), sub.map(|s| format!("{v}%, {s}")));
    let mut attrs = vec![
        ("role", "progressbar"),
        ("aria-valuemin", "0"),
        ("aria-valuemax", "100"),
        ("aria-valuenow", now.as_str()),
        ("aria-label", label),
    ];
    attrs.extend(text.as_deref().map(|t| ("aria-valuetext", t)));
    w.open("div", &cls, &attrs);
    w.el("span", "pgn", label);
    w.el("span", "pgv", &format!("{v}%"));
    w.open("span", "pgt", &[("style", &format!("--v:{v}"))]);
    w.el("b", "", "");
    w.close("span");
    if let Some(s) = sub {
        w.el("span", "pgs", s);
    }
    w.close("div");
}

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    let (steps, bars) = (list(b, "steps"), list(b, "bars"));
    let at = match get(b, "current") {
        Some(c) => steps.iter().position(|s| get(s, "id") == Some(c)),
        None => b
            .get("done")
            .and_then(Value::as_bool)
            .filter(|d| *d)
            .map(|_| steps.len()),
    };
    match at {
        Some(at) if !steps.is_empty() => return stepper(w, b, steps, at),
        _ if !steps.is_empty() || bars.is_empty() => return fallback(w, b),
        _ => {}
    }
    w.open_block("div", "pg", b, &[]);
    if let Some(t) = get(b, "title").filter(|t| !t.is_empty()) {
        w.el("div", "sh", t);
    }
    w.open("div", if bars.len() > 1 { "pgl rows" } else { "pgl" }, &[]);
    for r in bars {
        bar(w, r);
    }
    w.close("div");
    w.close("div");
}
