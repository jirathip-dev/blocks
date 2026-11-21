use std::path::{Path, PathBuf};

use blocks::Built;
use serde_json::{json, Value};

fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../..")
}

fn read(p: &Path) -> Value {
    serde_json::from_str(&std::fs::read_to_string(p).unwrap()).unwrap()
}

fn files(dir: &str) -> Vec<(String, Value)> {
    let mut out: Vec<(String, Value)> = std::fs::read_dir(root().join(dir))
        .unwrap()
        .map(|e| e.unwrap().path())
        .filter(|p| p.extension().is_some_and(|x| x == "json"))
        .map(|p| (format!("{dir}/{}", p.file_name().unwrap().to_string_lossy()), read(&p)))
        .collect();
    out.sort_by(|a, b| a.0.cmp(&b.0));
    out
}

fn blocks_in(v: &Value, out: &mut Vec<Value>) {
    match v {
        Value::Array(a) => a.iter().for_each(|x| blocks_in(x, out)),
        Value::Object(o) if o.contains_key("type") => out.push(v.clone()),
        Value::Object(o) => o.values().for_each(|x| blocks_in(x, out)),
        _ => {}
    }
}

fn row(id: &str) -> Value {
    json!({"type": "row", "id": id, "title": id})
}

fn faulty() -> Vec<(&'static str, Value, Vec<&'static str>)> {
    let steps = |extra: Value| {
        let mut s =
            json!({"type": "steps", "id": "st", "steps": [{"id": "a", "label": "A"}, {"id": "b", "label": "B"}]});
        s.as_object_mut().unwrap().extend(extra.as_object().unwrap().clone());
        json!({"type": "screen", "id": "s", "blocks": [s]})
    };
    vec![
        (
            "each-fault",
            json!({"type": "screen", "id": "s", "state": {"email": ""}, "blocks": [
                {"type": "row", "id": "a", "title": "one", "colour": "red"},
                {"type": "row", "id": "a", "title": "two"},
                {"type": "row", "id": "b", "title": 3},
                {"type": "text", "id": "", "markdown": "x", "show": {"get": "nope"}},
                {"type": "gauge", "id": "g"},
                {"type": "herd", "id": "h"},
                {"type": "island", "name": "x-map", "fallback": {"title": ""}},
                {"type": "form", "id": "f", "fields": [{"type": "text", "name": "email"}]}
            ]}),
            vec!["herd", "row"],
        ),
        (
            "twice-thrice",
            json!({"type": "screen", "id": "s", "blocks": [row("a"), row("a"), {"type": "list", "id": "l", "rows": [row("a"), row("s")]}]}),
            vec![],
        ),
        (
            "act-twice",
            json!({"type": "screen", "id": "s", "blocks": [
                {"type": "row", "id": "r", "title": "R", "tap": {"action": "go"}, "button": {"label": "Go", "action": "go"}},
                {"type": "row", "title": "x", "tap": {"action": "open"}},
                {"type": "row", "title": "y", "tap": {"action": "open"}},
                {"type": "list", "id": "l", "reorder": {"name": "to", "action": "sort"}, "move": {"name": "to", "action": "sort"}, "rows": [row("m")]},
                {"type": "list", "reorder": {"name": "to", "action": "drag"}, "rows": []}
            ]}),
            vec![],
        ),
        (
            "link",
            json!({"type": "screen", "id": "s", "blocks": [
                {"type": "row", "id": "a", "title": "a", "tap": {"url": "javascript:alert(1)"}},
                {"type": "row", "id": "b", "title": "b", "tap": {"open": " JaVa\tscript:x"}},
                {"type": "row", "id": "c", "title": "c", "tap": {"url": "mailto:a@b.c"}},
                {"type": "row", "id": "d", "title": "d", "tap": {"open": "/next?x=a:b"}},
                {"type": "nav", "id": "n", "links": [{"label": "x", "href": "data:text/html,hi"}, {"label": "y", "href": "https://x.y"}]}
            ]}),
            vec![],
        ),
        (
            "app-kinds",
            json!({"type": "screen", "id": "s", "blocks": [
                {"type": "herd", "id": "h", "fallback": {"title": "Herd"}},
                {"type": "gauge"},
                {"type": "island", "id": "i", "name": "map"},
                {"type": "island", "id": "j", "name": "map", "fallback": {"title": "Map"}}
            ]}),
            vec!["herd", "card", "screen"],
        ),
        (
            "state",
            json!({"type": "screen", "id": "s", "state": {"a": "", "b": 1}, "blocks": [
                {"type": "form", "id": "f", "fields": [{"type": "text", "name": "a"}, {"type": "text", "name": "c"}]},
                {"type": "chips", "id": "ch", "name": "c", "options": [{"value": "x", "label": "X"}]},
                {"type": "text", "id": "t", "markdown": "x", "show": {"all": [{"get": "b"}, {"get": "z"}, {"not": {"get": "y"}}]}}
            ]}),
            vec![],
        ),
        (
            "shape",
            json!({"type": "screen", "id": "s", "subtitle": null, "fallback": {"title": "S"}, "blocks": [
                {"type": "row", "id": "a"},
                {"type": "row", "id": "b", "title": 3},
                {"type": "row", "id": "c", "title": "c", "indent": 300},
                {"type": "row", "id": "d", "title": "d", "indent": -1},
                {"type": "row", "id": "e", "title": "e", "indent": 2.5},
                {"type": "row", "id": "f", "title": "f", "indent": 2, "subtitle": null, "zeta": 1, "alpha": 2},
                {"type": "row", "id": "g", "title": "g", "tap": {"action": "x", "later": true}},
                {"type": "row", "id": "h", "title": "h", "tap": "nowhere"},
                {"type": "section", "id": "i", "blocks": "not a list"},
                {"type": "toast", "id": "j", "title": "Saved", "tone": "a-new-tone"},
                {"type": "config", "id": "k", "fields": [{"type": "text"}]},
                {"type": "card", "id": "l", "title": "x", "buttons": [5, "x"]},
                5,
                "row"
            ]}),
            vec![],
        ),
        ("steps-no-current", steps(json!({"current": "zz"})), vec![]),
        (
            "steps-done-and-current",
            steps(json!({"current": "a", "done": true})),
            vec![],
        ),
        ("steps-neither", steps(json!({})), vec![]),
        ("steps-and-bars", steps(json!({"current": "a", "bars": []})), vec![]),
        ("steps-placed", steps(json!({"current": "b"})), vec![]),
        ("no-object", json!("screen"), vec![]),
    ]
}

fn cases() -> String {
    let mut all: Vec<(String, Value, Vec<&str>)> =
        faulty().into_iter().map(|(n, s, a)| (n.to_string(), s, a)).collect();
    for (name, v) in files("fixtures/blocks").into_iter().chain(files("fixtures/built")) {
        all.push((name, v, vec![]));
    }
    for app in ["cooee", "drover"] {
        for (name, v) in files(&format!("fixtures/screens/{app}")) {
            let mut found = vec![];
            blocks_in(&v, &mut found);
            let named = found
                .into_iter()
                .enumerate()
                .map(|(i, b)| (format!("{name}#{i}"), b, vec![]));
            all.extend(named);
        }
    }
    let out: Vec<Value> = all
        .into_iter()
        .map(|(name, screen, app)| {
            let faults = Built::new(screen.clone()).check(&app);
            json!({"name": name, "screen": screen, "app": app, "faults": faults})
        })
        .collect();
    serde_json::to_string_pretty(&out).unwrap() + "\n"
}

#[test]
fn generated_cases_are_the_crates_faults() {
    let want = cases();
    let at = root().join("fixtures/check/cases.json");
    if std::env::var_os("BLOCKS_GEN").is_some() {
        std::fs::create_dir_all(at.parent().unwrap()).unwrap();
        std::fs::write(&at, &want).unwrap();
    }
    let got = std::fs::read_to_string(&at).unwrap_or_default();
    assert!(
        got == want,
        "fixtures/check/cases.json is not what Built::check gives: run `just gen`"
    );
}

#[test]
fn the_cases_cover_every_fault() {
    let all: Value = serde_json::from_str(&cases()).unwrap();
    let mut seen: Vec<&str> = all
        .as_array()
        .unwrap()
        .iter()
        .flat_map(|c| c["faults"].as_array().unwrap())
        .map(|f| f["fault"].as_str().unwrap())
        .collect();
    seen.sort_unstable();
    seen.dedup();
    let want = [
        "act-twice",
        "bare",
        "clash",
        "extra",
        "link",
        "shape",
        "state",
        "twice",
        "unknown",
        "unnamed",
    ];
    assert_eq!(seen, want);
}
