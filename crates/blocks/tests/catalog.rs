use std::path::Path;

use blocks::catalog::Catalog;
use blocks::guard;
use blocks::{Block, Built, Fault};
use serde_json::json;

fn fixture() -> Catalog {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/guard/bad/catalog.json");
    Catalog::read(&std::fs::read_to_string(path).unwrap()).unwrap()
}

fn seen(blocks: &serde_json::Value) -> Vec<(String, String)> {
    let screen = Built::new(json!({"type": "screen", "id": "s", "title": "Queue", "blocks": blocks}));
    guard::lint_in(&screen, &fixture())
        .into_iter()
        .map(|s| (s.rule, s.detail))
        .collect()
}

#[test]
fn a_catalog_loads_with_its_defaults_and_says_what_it_sends() {
    let c = Catalog::read(r#"{"name": "say", "kinds": {"text": {}, "button": {"actions": ["pick"]}}}"#).unwrap();
    assert_eq!((c.max.blocks, c.max.chars), (40, 16_000));
    assert!(c.links.is_empty() && c.media.is_empty() && c.example.is_none());
    assert!(c.sends("pick"));
    assert!(!c.sends("wipe"));
    assert!(!fixture().sends("wipe"));
    assert!(fixture().sends("save"));
}

#[test]
fn a_catalog_that_could_allow_more_than_it_says_does_not_load() {
    let cases = [
        (r#"{"name": "x", "kinds": {}, "link": []}"#, "unknown field `link`"),
        (
            r#"{"name": "x", "kinds": {"text": {"action": []}}}"#,
            "unknown field `action`",
        ),
        (r#"{"name": "x", "kinds": {"chat": {}}}"#, "`chat` is no core kind"),
        (
            r#"{"name": "x", "kinds": {"text": {"fields": ["markdwn"]}}}"#,
            "`text` has no field `markdwn`",
        ),
        (
            r#"{"name": "x", "kinds": {"text": {"fields": ["id"]}}}"#,
            "`text`: `id` is never offered to a model",
        ),
        (
            r#"{"name": "x", "kinds": {"button": {"fields": ["enabled"]}}}"#,
            "`button`: `enabled` is never offered",
        ),
        (
            r#"{"name": "x", "kinds": {"button": {"inputs": ["text"]}}}"#,
            "`button` takes no inputs",
        ),
        (
            r#"{"name": "x", "kinds": {"form": {"inputs": ["dial"]}}}"#,
            "`form`: `dial` is no field type",
        ),
        (
            r#"{"name": "x", "kinds": {}, "links": ["https://a.example"]}"#,
            "`https://a.example` must end in `/` or `:`",
        ),
        (
            r#"{"name": "x", "kinds": {}, "media": ["/media"]}"#,
            "`/media` must end in `/` or `:`",
        ),
    ];
    for (json, why) in cases {
        let err = Catalog::read(json).unwrap_err();
        assert!(err.contains(why), "{json}: {err}");
    }
    let named = r#"{"name": "x", "kinds": {"form": {"fields": ["fields", "more", "submit"], "inputs": ["text"]}}}"#;
    assert!(Catalog::read(named).is_ok());
}

#[test]
fn a_screen_inside_its_catalog_fits_and_one_outside_is_told_the_list() {
    let fits = json!([
        {"type": "text", "id": "t", "markdown": "Pick a plan, see [docs](https://docs.example/)."},
        {"type": "button", "id": "b", "label": "Pro", "action": "pick", "values": {"plan": "pro"}},
        {"type": "media", "id": "m", "src": "https://cdn.example/a.png", "alt": "A plan", "width": 4, "height": 3},
    ]);
    assert_eq!(seen(&fits), []);
    let card = json!([{"type": "card", "id": "c", "title": "Plans"}]);
    let kinds = "`card`; use only: button, form, media, row, section, text".to_string();
    assert_eq!(seen(&card), [("catalog/kind".into(), kinds)]);
    let action = json!([{"type": "button", "id": "b", "label": "Go", "action": "wipe"}]);
    let told = "`wipe`; this kind may send: pick".to_string();
    assert_eq!(seen(&action), [("catalog/action".into(), told)]);
    let row = json!([{"type": "row", "id": "r", "title": "Go", "tap": {"action": "pick", "focus": "x"}}]);
    let rules: Vec<String> = seen(&row).into_iter().map(|(r, _)| r).collect();
    assert_eq!(rules, ["catalog/action", "catalog/field"]);
}

#[test]
fn a_link_written_inside_markdown_is_held_to_the_catalog_links() {
    let md = "[a](http://evil.example/) ![i](javascript:x) <mailto:x@y> ftp://z.example/f [ok](https://docs.example/)";
    let found: Vec<String> = seen(&json!([{"type": "text", "id": "t", "markdown": md}]))
        .into_iter()
        .map(|(r, d)| format!("{r} {d}"))
        .collect();
    let told = |u: &str| format!("catalog/link `{u}`; a link may start with: https://");
    let want: Vec<String> = [
        "ftp://z.example/f",
        "http://evil.example/",
        "javascript:x",
        "mailto:x@y",
    ]
    .map(told)
    .into();
    assert_eq!(found, want);
}

#[test]
fn local_state_is_offered_by_no_catalog() {
    let shown = json!([{"type": "text", "id": "t", "markdown": "Hi", "show": {"get": "open"}}]);
    let found: Vec<String> = seen(&shown)
        .into_iter()
        .filter(|(r, _)| r == "catalog/field")
        .map(|(_, d)| d)
        .collect();
    assert_eq!(
        found,
        ["`get`; this kind takes: markdown", "`show`; this kind takes: markdown"]
    );
    let set = json!([{"type": "button", "id": "b", "label": "Go", "tap": {"set": [{"key": "k", "to": true}]}}]);
    let rules: Vec<String> = seen(&set).into_iter().map(|(r, _)| r).collect();
    assert!(rules.contains(&"catalog/field".to_string()), "{rules:?}");
}

#[test]
fn a_link_or_a_file_must_start_with_a_listed_start_and_hold_nothing_odd() {
    let link = |u: &str| seen(&json!([{"type": "row", "id": "r", "title": "Go", "tap": {"url": u}}]));
    for ok in ["https://docs.example/a", "https://"] {
        assert_eq!(link(ok), [], "{ok}");
    }
    for bad in [
        "http://docs.example/",
        "//evil.example/",
        "https://a.example/a b",
        "https://a\\b",
        "mailto:x@y",
    ] {
        let rules: Vec<String> = link(bad).into_iter().map(|(r, _)| r).collect();
        assert!(rules.contains(&"catalog/link".to_string()), "{bad}: {rules:?}");
    }
    let src = |s: &str| seen(&json!([{"type": "media", "id": "m", "src": s, "alt": "A", "width": 1, "height": 1}]));
    assert_eq!(src("https://cdn.example/x.png"), []);
    let rules: Vec<String> = src("https://cdn.example.evil.net/x.png")
        .into_iter()
        .map(|(r, _)| r)
        .collect();
    assert!(rules.contains(&"catalog/media".to_string()), "{rules:?}");
}

#[test]
fn a_shape_fault_names_the_field_at_fault() {
    let screen = Built::new(json!({"type": "screen", "id": "s", "blocks": [{"type": "button", "id": "b"}]}));
    let faults = screen.check(&[]);
    assert!(
        faults.contains(&Fault::Shape {
            kind: "button".into(),
            why: "missing field `label`".into()
        }),
        "{faults:?}"
    );
    let read = Block::read("button", json!({"type": "button", "label": "Go"})).unwrap();
    assert_eq!(read.kind(), "button");
    assert_eq!(read.more().map(serde_json::Map::len), Some(0));
    let app = Block::read("chart-of-mine", json!({"type": "chart-of-mine", "id": "x"})).unwrap();
    assert_eq!(app.kind(), "chart-of-mine");
}

#[test]
fn every_kind_offers_the_fields_its_sample_writes_and_no_other() {
    for (kind, b) in blocks::samples() {
        let v = serde_json::to_value(&b).unwrap();
        let fields: Vec<&String> = v
            .as_object()
            .unwrap()
            .keys()
            .filter(|k| !blocks::catalog::NEVER.contains(&k.as_str()))
            .collect();
        let json = json!({"name": "x", "kinds": {kind: {"fields": fields}}}).to_string();
        assert!(
            Catalog::read(&json).is_ok(),
            "{kind}: {}",
            Catalog::read(&json).unwrap_err()
        );
        let bogus = json!({"name": "x", "kinds": {kind: {"fields": ["zzz"]}}}).to_string();
        assert!(Catalog::read(&bogus).is_err(), "{kind}");
    }
}
