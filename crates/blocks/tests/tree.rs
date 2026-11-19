use blocks::behave::start;
use blocks::expr::{Lit, State};
use blocks::tree::{check, expect, expect_fields, Drawn, FieldDrawn, Node, Report};
use blocks::{Block, Built};
use serde_json::json;

fn screen() -> Built {
    Built::new(json!({
        "type": "screen", "id": "home", "title": "Home",
        "blocks": [
            {"type": "text", "id": "hint", "markdown": "Ready", "show": {"get": "ready"}},
            {"type": "list", "id": "rows", "rows": [{"type": "row", "id": "r1", "title": "a", "style": "link"}]},
            {"type": "config", "id": "cfg", "rows": [{"type": "row", "id": "r2", "title": "b"}],
             "blocks": [{"type": "text", "id": "t", "markdown": "x"}]}
        ]
    }))
}

#[test]
fn expect_marks_native_fallback_and_hidden_blocks_in_drawn_order() {
    let kinds = ["screen", "text", "list", "row"];
    let ready = State::from([("ready".into(), Lit::Bool(true))]);
    let t = expect(&screen(), &kinds, &ready);
    assert_eq!(t.drawn, Drawn::Native);
    let ids: Vec<_> = t.children.iter().map(|c| (c.id.clone().unwrap(), c.drawn)).collect();
    assert_eq!(
        ids,
        [
            ("hint".into(), Drawn::Native),
            ("rows".into(), Drawn::Native),
            ("cfg".into(), Drawn::Fallback)
        ]
    );
    assert_eq!(t.children[1].children[0].variant.as_deref(), Some("link"));
    let cfg: Vec<_> = t.children[2].children.iter().map(|c| c.kind.as_str()).collect();
    assert_eq!(cfg, ["text"], "a fallback draws its blocks, not its rows");
    assert!(t.children.iter().all(|c| c.rect.is_none() && c.text.is_none()));
    let off = expect(&screen(), &kinds, &State::new());
    assert_eq!(off.children[0].drawn, Drawn::Hidden);
}

#[test]
fn a_report_without_frame_timings_still_reads_and_writes_none() {
    let old = json!({"shots": [], "sent": [], "dropped": [], "timings": {"first_paint_ms": 9.0, "steps_ms": [1.0]}});
    let r: Report = serde_json::from_value(old.clone()).unwrap();
    assert_eq!(r.timings.longest_frame_ms, None);
    assert_eq!(serde_json::to_value(&r).unwrap(), old);
    let new = json!({"first_paint_ms": 9.0, "steps_ms": [], "longest_frame_ms": 5.0, "frames_over_budget": 0, "longest_patch_ms": 1.0});
    let t: blocks::tree::Timings = serde_json::from_value(new.clone()).unwrap();
    assert_eq!((t.frames_over_budget, t.longest_patch_ms), (Some(0), Some(1.0)));
    assert_eq!(serde_json::to_value(&t).unwrap(), new);
}

#[test]
fn check_gives_the_committed_findings_for_each_failing_case() {
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../fixtures/trees/fail/cases.json");
    let cases: Vec<serde_json::Value> = serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap();
    assert!(cases.len() >= 5);
    for c in cases {
        let (tree, want): (Node, Node) = serde_json::from_value(json!([c["tree"], c["want"]])).unwrap();
        let want_findings: Vec<String> = serde_json::from_value(c["findings"].clone()).unwrap();
        assert_eq!(check(Some(&tree), &want, "tree"), want_findings, "{}", c["name"]);
        assert_eq!(check(Some(&want), &want, "tree"), Vec::<String>::new());
    }
}

#[test]
fn expect_fields_lists_each_forms_fields_native_plain_or_hidden_and_check_compares_them() {
    let s = Built::new(json!({
        "type": "screen", "id": "s", "state": {"off": false},
        "blocks": [{"type": "form", "id": "f", "fields": [
            {"type": "toggle", "name": "a", "label": "Agree"},
            {"type": "rating", "name": "r"},
            {"type": "text", "name": "h", "show": {"get": "off"}}
        ]}]
    }));
    let want = expect_fields(&s, Block::KINDS, &["toggle", "text"], &start(&s));
    let fields = want.children[0].fields.clone().unwrap();
    let got: Vec<_> = fields
        .iter()
        .map(|f| (f.name.as_str(), f.drawn, f.role.as_str(), f.label.as_str()))
        .collect();
    assert_eq!(
        got,
        [
            ("a", FieldDrawn::Native, "switch", "Agree"),
            ("r", FieldDrawn::Plain, "textbox", "r"),
            ("h", FieldDrawn::Hidden, "textbox", "h"),
        ]
    );
    assert!(expect(&s, Block::KINDS, &start(&s)).children[0].fields.is_none());
    let mut drew = want.clone();
    drew.children[0].fields.as_mut().unwrap()[0].drawn = FieldDrawn::Plain;
    assert_eq!(check(Some(&drew), &want, "").len(), 1);
    assert!(check(Some(&want), &want, "").is_empty());
}
