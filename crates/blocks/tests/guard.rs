use std::collections::BTreeSet;
use std::path::{Path, PathBuf};

use blocks::guard::{self, Severity, RULES, VERSION};
use blocks::Built;

fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../..")
}

fn read(path: &Path) -> Built {
    Built::new(serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap())
}

fn fired(path: &Path) -> BTreeSet<String> {
    guard::lint(&read(path), &[]).into_iter().map(|s| s.rule).collect()
}

fn files(dir: &str) -> Vec<PathBuf> {
    let mut out: Vec<PathBuf> = std::fs::read_dir(root().join(dir))
        .unwrap()
        .map(|e| e.unwrap().path())
        .collect();
    out.sort();
    out
}

#[test]
fn every_rule_has_a_what_a_fix_an_engine_and_a_unique_id() {
    let mut ids = BTreeSet::new();
    for r in RULES {
        assert!(ids.insert(r.id), "{}: the id twice", r.id);
        assert!(!r.what.trim().is_empty(), "{}: no what", r.id);
        assert!(r.fix.ends_with('.') && r.fix.len() > 10, "{}: no fix sentence", r.id);
        assert!((1..=VERSION).contains(&r.since), "{}: since {}", r.id, r.since);
        let (engine, name) = r.id.split_once('/').unwrap();
        assert!(
            ["lint", "render", "css", "explore", "guard"].contains(&engine),
            "{}",
            r.id
        );
        assert!(
            !name.is_empty() && name.chars().all(|c| c.is_ascii_lowercase() || c == '-'),
            "{}",
            r.id
        );
        assert_eq!(guard::rule(r.id), Some(*r));
    }
    assert_eq!(RULES.len(), 39);
    assert_eq!(guard::rule("lint/nope"), None);
}

#[test]
fn every_lint_rule_has_a_bad_fixture_that_fires_it_and_no_other() {
    let lint: BTreeSet<String> = RULES
        .iter()
        .filter(|r| r.id.starts_with("lint/"))
        .map(|r| r.id.to_string())
        .collect();
    assert_eq!(lint.len(), 16);
    let bad: BTreeSet<String> = files("fixtures/guard/bad/lint")
        .iter()
        .map(|p| format!("lint/{}", p.file_stem().unwrap().to_string_lossy()))
        .collect();
    assert_eq!(bad, lint);
    for id in lint {
        let path = root().join("fixtures/guard/bad").join(format!("{id}.json"));
        assert_eq!(fired(&path), BTreeSet::from([id.clone()]), "{id}");
    }
}

#[test]
fn no_ok_fixture_fires_a_rule() {
    let ok = files("fixtures/guard/ok");
    assert!(ok.len() >= 2);
    for path in ok {
        assert_eq!(guard::lint(&read(&path), &[]), [], "{}", path.display());
    }
}

#[test]
fn a_finding_carries_its_rules_fix_and_names_the_block_by_its_ids() {
    let path = root().join("fixtures/guard/bad/lint/label-long.json");
    let seen = guard::lint(&read(&path), &[]);
    let found: Vec<_> = seen
        .into_iter()
        .map(|s| guard::finding(s, "fixtures/guard/bad/lint/label-long.json").unwrap())
        .collect();
    assert_eq!(found.len(), 1);
    let f = &found[0];
    assert_eq!(f.at, "screen#s/button#go");
    assert_eq!(f.severity, Severity::Error);
    assert_eq!(f.file, "fixtures/guard/bad/lint/label-long.json");
    assert_eq!(
        f.message,
        "a button, act or chip label over 30 characters, or a badge over 20: 38 characters"
    );
    assert_eq!(f.fix, guard::rule("lint/label-long").unwrap().fix);
    let json = serde_json::to_value(f).unwrap();
    assert_eq!(json["severity"], "error");
    assert_eq!(json["fix"], f.fix.as_str());
}

#[test]
fn a_block_with_no_id_is_named_by_its_place_among_its_kind() {
    let path = root().join("fixtures/guard/bad/lint/depth.json");
    let at: Vec<String> = guard::lint(&read(&path), &[]).into_iter().map(|s| s.at).collect();
    let deep = "screen#s/section~0/section~0/section~0/section~0/section~0/section~0/text~0";
    assert_eq!(at, [deep]);
    let level = root().join("fixtures/guard/bad/lint/level-blocks.json");
    let mut built = read(&level).value().clone();
    built["blocks"][12]["id"] = "last".into();
    let walk = guard::lint(&Built::new(built), &[]);
    assert_eq!(walk.len(), 1);
    assert_eq!(walk[0].at, "screen#s");
}

#[test]
fn a_seen_of_no_rule_makes_no_finding() {
    let seen: guard::Seen = serde_json::from_str(r#"{"rule": "render/nope", "at": "", "detail": ""}"#).unwrap();
    assert_eq!(guard::finding(seen, "x.json"), None);
    let probe: guard::Seen = serde_json::from_str(
        r#"{"rule": "css/fixed-width", "at": "", "detail": "480 px", "file": "app.css", "line": 7}"#,
    )
    .unwrap();
    let f = guard::finding(probe, "fixtures/screens/queue.json").unwrap();
    assert_eq!((f.file.as_str(), f.line), ("app.css", Some(7)));
    assert_eq!(f.fix, "Use `max-width`, or a width in `%`.");
}
