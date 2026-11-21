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
    assert_eq!(RULES.len(), 43);
    assert_eq!(guard::rule("lint/nope"), None);
}

#[test]
fn every_lint_rule_has_a_bad_fixture_that_fires_it_and_no_other() {
    let lint: BTreeSet<String> = RULES
        .iter()
        .filter(|r| r.id.starts_with("lint/"))
        .map(|r| r.id.to_string())
        .collect();
    assert_eq!(lint.len(), 19);
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
        "a button, act or chip label, or a message's or tool's name, over 30 characters, or a badge over 20: 38 characters"
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

#[cfg(feature = "schema")]
#[test]
fn codegen_refuses_an_example_with_a_finding() {
    let tmp = Path::new(env!("CARGO_TARGET_TMPDIR")).join("skill-bad-example");
    let ok = tmp.join("fixtures/guard/ok");
    std::fs::create_dir_all(&ok).unwrap();
    std::fs::copy(
        root().join("fixtures/guard/bad/lint/title-long.json"),
        ok.join("long.json"),
    )
    .unwrap();
    let e = blocks::codegen::write(&tmp).unwrap_err().to_string();
    assert!(
        e.contains("fixtures/guard/ok/long.json: an example with a finding: lint/title-long"),
        "{e}"
    );
    assert!(!tmp.join("skill/blocks/examples").exists());
}

fn answer(a: &blocks::Action) -> blocks::Answer {
    let ops = match a.action.as_str() {
        "go" => serde_json::json!([{ "op": "merge", "id": "gone", "fields": { "title": "x" } }]),
        _ => serde_json::json!([]),
    };
    serde_json::from_value(serde_json::json!({ "ops": ops })).unwrap()
}

fn steps(json: serde_json::Value) -> Vec<blocks::tree::Step> {
    serde_json::from_value(json).unwrap()
}

#[test]
fn a_seeded_walk_finds_the_bad_answer_and_shrinks_it_to_its_shortest_steps() {
    use guard::explore::{replay, shrink, walk};
    let screen = read(&root().join("fixtures/guard/bad/explore/error-screen.json"));
    assert_eq!(guard::lint(&screen, &[]), []);
    let w = walk(&screen, &[], 7, 30, &mut |a| Some(Ok(answer(a))));
    assert_eq!(
        w,
        walk(&screen, &[], 7, 30, &mut |a| Some(Ok(answer(a)))),
        "the same seed walks the same"
    );
    assert_ne!(w.steps, walk(&screen, &[], 8, 30, &mut |a| Some(Ok(answer(a)))).steps);
    let at = "screen#s/section#box/button#go";
    assert_eq!(
        (w.seen.len(), w.seen[0].rule.as_str(), w.seen[0].at.as_str()),
        (1, "explore/error-screen", at)
    );
    assert!(w.steps.len() > 4, "{:?}", w.steps);
    assert_eq!(w.sent.last().unwrap().action, "go");
    let mut tries = 0;
    let short = shrink(
        &w.steps,
        &mut |s| {
            tries += 1;
            replay(&screen, &[], s)
                .seen
                .iter()
                .any(|x| x.rule == "explore/error-screen" && x.at == at)
        },
        40,
    );
    assert!(tries <= 40);
    let want = steps(serde_json::json!([
        { "tap": { "id": "more" } },
        { "tap": { "id": "go" } },
        { "answer": { "ops": [{ "op": "merge", "id": "gone", "fields": { "title": "x" } }] } }
    ]));
    assert_eq!(short, want);
    assert_eq!(replay(&screen, &[], &short).seen, w.seen);
    assert_eq!(
        replay(&screen, &[], &want[1..]).seen,
        [],
        "go is hidden until more is tapped"
    );
}

#[test]
fn an_action_with_no_answer_or_an_error_answer_is_seen_and_the_harness_must_send_what_was_declared() {
    use guard::explore::{replay, sent_differs, walk};
    let screen = read(&root().join("fixtures/guard/bad/explore/error-screen.json"));
    let w = walk(&screen, &[], 3, 30, &mut |_| None);
    assert_eq!(w.seen[0].rule, "explore/unanswered");
    let refused = replay(
        &screen,
        &[],
        &steps(serde_json::json!([{ "tap": { "id": "a" } }, { "refuse": { "toast": "down" } }])),
    );
    assert_eq!(refused.seen[0].rule, "explore/error-screen");
    assert_eq!(refused.seen[0].detail, "down");
    assert_eq!(sent_differs(&refused.sent, &["a".into()]), None);
    let differs = sent_differs(&refused.sent, &[]).unwrap();
    assert_eq!(
        (differs.rule.as_str(), differs.detail.as_str()),
        ("explore/sent-differs", r#"sent [], declared ["a"]"#)
    );
    let typed = walk(
        &read(&root().join("fixtures/guard/ok/ok-sheet.json")),
        &[],
        1,
        30,
        &mut |a| Some(Ok(answer(a))),
    );
    assert_eq!(typed.seen, []);
}

#[test]
fn a_message_widens_label_long_label_empty_and_empty_state() {
    let msg = |name: &str, blocks: serde_json::Value, files: serde_json::Value| {
        let m = serde_json::json!({"type": "message", "id": "m", "role": "agent", "name": name, "blocks": blocks, "files": files});
        let s = serde_json::json!({"type": "screen", "id": "s", "title": "Thread", "blocks": [m]});
        guard::lint(&Built::new(s), &[])
            .into_iter()
            .map(|x| (x.rule, x.detail))
            .collect::<Vec<_>>()
    };
    let tool = serde_json::json!([{"type": "tool", "id": "t", "name": "", "state": "done"}]);
    let file = serde_json::json!([{"name": " ", "tap": {"url": "/f"}}]);
    let long = "a name that runs past thirty characters";
    assert_eq!(
        msg(long, serde_json::json!([]), file.clone()),
        [
            ("lint/label-empty".into(), "a blank attachment name".into()),
            ("lint/label-long".into(), "39 characters".into()),
        ]
    );
    assert_eq!(
        msg("Scout", tool, serde_json::json!([])),
        [("lint/label-empty".into(), "a blank name".into())]
    );
    assert_eq!(
        msg("Scout", serde_json::json!([]), serde_json::json!([])),
        [("lint/empty-state".into(), "an empty message".into())]
    );
    assert_eq!(
        msg(
            "Scout",
            serde_json::json!([]),
            serde_json::json!([{"name": "a.pdf", "tap": {"url": "/f"}}])
        ),
        []
    );
}
