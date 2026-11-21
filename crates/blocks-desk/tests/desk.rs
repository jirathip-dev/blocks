use std::path::{Path, PathBuf};
use std::process::Command;

use blocks::behave::start;
use blocks::tree::{check, expect, Drawn, Node, Step};
use blocks::{Block, Built};
use blocks_desk::{Desk, Ids, Want};
use serde_json::json;

fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../..")
}

fn screens() -> Vec<(String, Block)> {
    let mut out = vec![];
    for dir in ["blocks", "stress"] {
        for e in std::fs::read_dir(root().join("fixtures").join(dir)).unwrap() {
            let p = e.unwrap().path();
            let name = p.file_name().unwrap().to_string_lossy().into_owned();
            if dir == "stress" && !name.contains('-') {
                continue;
            }
            let text = std::fs::read_to_string(&p).unwrap();
            out.push((format!("{dir}/{name}"), serde_json::from_str(&text).unwrap()));
        }
    }
    assert!(out.len() > 60, "{} fixtures", out.len());
    out
}

fn steps(v: serde_json::Value) -> Vec<Step> {
    serde_json::from_value(v).unwrap()
}

fn every(n: &Node, f: &mut impl FnMut(&Node)) {
    f(n);
    n.children.iter().for_each(|c| every(c, f));
}

#[test]
fn every_fixture_passes_the_check_at_390_and_1440_with_a_sized_tree() {
    for (name, block) in screens() {
        for (w, h) in [(390, 844), (1440, 900)] {
            let mut run = Desk::new(block.clone())
                .size(w, h)
                .run(&steps(json!([{"shot": {"name": "s"}}])));
            run.check(&Want::default());
            assert!(run.faults.is_empty(), "{name} at {w}: {:#?}", run.faults);
            assert_eq!(run.report.shots, ["s"]);
            let size = [u32::from(w).to_be_bytes(), u32::from(h).to_be_bytes()].concat();
            assert_eq!(run.shots[0].png[12..24], [b"IHDR".as_slice(), &size].concat(), "{name}");
            every(&run.shots[0].tree, &mut |n| {
                let sized = n.rect.is_some_and(|[_, _, w, h]| w > 0.0 && h > 0.0);
                assert_eq!(sized, n.drawn != Drawn::Hidden, "{name}: {n:?}");
            });
        }
    }
}

#[test]
fn a_long_text_wraps_inside_a_narrow_screen() {
    let text = std::fs::read_to_string(root().join("fixtures/stress/text-long.json")).unwrap();
    let block: Block = serde_json::from_str(&text).unwrap();
    let rect = |w| {
        Desk::new(block.clone())
            .size(w, 900)
            .run(&steps(json!([{"shot": {"name": "s"}}])))
            .shots[0]
            .tree
            .rect
            .unwrap()
    };
    let ([_, _, nw, nh], [_, _, _, wh]) = (rect(390), rect(1440));
    assert!(nw <= 390.0 && nh > wh, "{nw}x{nh} at 390, {wh} high at 1440");
}

#[test]
fn the_check_names_a_wrong_tree_and_wrong_ids() {
    let screen: Block = serde_json::from_value(json!({"type": "screen", "id": "s", "blocks": [
        {"type": "text", "id": "a", "text": "one"}
    ]}))
    .unwrap();
    let mut run = Desk::new(screen.clone()).run(&steps(json!([{"shot": {"name": "x"}}])));
    let mut other = run.shots[0].tree.clone();
    other.children[0].id = Some("b".into());
    let ids = Ids {
        blocks: vec!["s".into()],
        actions: vec![],
    };
    run.check(&Want {
        tree: Some(other),
        ids: Some(ids),
    });
    assert_eq!(
        run.faults,
        [
            "x/screen#s: drew text#a native, expected text#b native",
            "x: drew ids Ids { blocks: [\"s\", \"a\"], actions: [] }, expected Ids { blocks: [\"s\"], actions: [] }",
        ]
    );
}

#[test]
fn a_frame_and_an_answer_land_through_apply_and_a_tap_on_nothing_live_is_dropped() {
    let screen: Block = serde_json::from_value(json!({"type": "screen", "id": "s", "blocks": [
        {"type": "text", "id": "a", "text": "one"},
        {"type": "text", "id": "off", "text": "gone", "show": {"get": "never"}}
    ]}))
    .unwrap();
    let mut run = Desk::new(screen).run(&steps(json!([
        {"tap": {"id": "a"}},
        {"tap": {"id": "off"}},
        {"frame": {"k": "s", "rev": 2, "ops": [{"op": "insert", "into": "s", "block": {"type": "text", "id": "b", "text": "two"}}]}},
        {"shot": {"name": "inserted"}},
        {"answer": {"ops": [{"op": "remove", "id": "a"}]}},
        {"shot": {"name": "removed"}},
        {"answer": {"ops": [{"op": "remove", "id": "nope"}]}},
        {"type": {"id": "b", "text": "x"}}
    ])));
    let ids = |i: usize| run.shots[i].ids.blocks.clone();
    assert_eq!(ids(0), ["s", "a", "b"]);
    assert_eq!(ids(1), ["s", "b"]);
    assert_eq!(run.report.shots, ["inserted", "removed"]);
    assert_eq!(run.report.dropped, ["tap a", "tap off", "type b"]);
    let t = &run.report.timings;
    assert_eq!(t.steps_ms.len(), 8);
    assert!(t.longest_frame_ms.is_some_and(|f| f > 0.0), "{t:?}");
    assert!(t.frames_over_budget.is_some());
    assert!(t.longest_patch_ms.is_some_and(|p| p > 0.0), "{t:?}");
    assert_eq!(run.report.sent, []);
    assert_eq!(run.faults.len(), 1, "{:?}", run.faults);
    run.faults.clear();
    run.check(&Want::default());
    assert!(run.faults.is_empty(), "{:?}", run.faults);
}

fn desk(args: &[&str]) -> (Option<i32>, String) {
    let out = Command::new(env!("CARGO_BIN_EXE_blocks-desk"))
        .current_dir(root())
        .args(args)
        .output()
        .unwrap();
    (out.status.code(), String::from_utf8_lossy(&out.stderr).into_owned())
}

#[test]
fn the_binary_writes_the_tree_and_the_report_and_exits_1_on_a_fault_or_bad_flags() {
    let dir = Path::new(env!("CARGO_TARGET_TMPDIR")).join("desk-bin");
    let out = dir.to_str().unwrap();
    let ok = [
        "--screen",
        "fixtures/blocks/screen.json",
        "--size",
        "1440x900",
        "--scheme",
        "dark",
        "--ids",
        "fixtures/ids/screen.json",
        "--check",
        "--out",
        out,
    ];
    assert_eq!(desk(&ok), (Some(0), String::new()));
    let tree: Node = serde_json::from_str(&std::fs::read_to_string(dir.join("screen.tree.json")).unwrap()).unwrap();
    let screen = std::fs::read_to_string(root().join("fixtures/blocks/screen.json")).unwrap();
    let run = Desk::new(serde_json::from_str(&screen).unwrap())
        .size(1440, 900)
        .run(&steps(json!([{"shot": {"name": "s"}}])));
    assert_eq!(tree, run.shots[0].tree);
    let report: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(dir.join("report.json")).unwrap()).unwrap();
    assert_eq!(report["shots"], json!(["screen"]));
    let png = std::fs::read(dir.join("screen.png")).unwrap();
    assert_eq!(png, run.shots[0].png);

    let wrong = [
        "--screen",
        "fixtures/blocks/screen.json",
        "--ids",
        "fixtures/ids/button.json",
        "--check",
        "--out",
        out,
    ];
    let (code, err) = desk(&wrong);
    assert_eq!(code, Some(1));
    assert!(err.starts_with("Error: screen: drew ids"), "{err}");

    for bad in [
        &["--screen", "fixtures/blocks/screen.json"][..],
        &["--screen", "x.json", "--size", "big", "--out", out],
    ] {
        let (code, err) = desk(bad);
        assert_eq!(code, Some(1));
        assert!(
            err.starts_with("Error: blocks-desk: usage: blocks-desk --screen"),
            "{err}"
        );
    }
}

fn fixture(path: &str) -> serde_json::Value {
    serde_json::from_str(&std::fs::read_to_string(root().join("fixtures").join(path)).unwrap()).unwrap()
}

fn sent(screen: serde_json::Value, script: serde_json::Value) -> (Vec<serde_json::Value>, Vec<String>) {
    let mut run = Desk::new(serde_json::from_value(screen).unwrap()).run(&steps(script));
    run.check(&Want::default());
    assert!(run.faults.is_empty(), "{:?}", run.faults);
    let sent = run
        .report
        .sent
        .iter()
        .map(|a| serde_json::to_value(a).unwrap())
        .collect();
    (sent, run.report.dropped)
}

#[test]
fn a_scripted_tap_on_each_control_sends_the_action_its_fixture_names() {
    let tap = |id: &str| json!([{"tap": {"id": id}}, {"shot": {"name": "s"}}]);
    let cases = [
        (
            fixture("blocks/button.json"),
            "save",
            json!({"screen": "save", "block": "save", "action": "save"}),
        ),
        (
            fixture("blocks/choice.json"),
            "ask",
            json!({"screen": "ask", "block": "ask", "action": "answer", "values": {"choice": "yes"}}),
        ),
        (
            fixture("blocks/run.json"),
            "run",
            json!({"screen": "run", "block": "run", "action": "approve", "values": {"choice": "approve", "sha": "4f2a9c1"}}),
        ),
        (
            json!({"type": "chips", "id": "effort", "name": "effort", "action": "pick", "options": [{"value": "low", "label": "low"}]}),
            "effort",
            json!({"screen": "effort", "block": "effort", "action": "pick", "values": {"effort": ["low"]}}),
        ),
        (
            json!({"type": "card", "id": "c", "title": "Open", "tap": {"action": "open", "values": {"n": 1}}}),
            "c",
            json!({"screen": "c", "block": "c", "action": "open", "values": {"n": 1}}),
        ),
    ];
    for (screen, id, want) in cases {
        assert_eq!(sent(screen, tap(id)), (vec![want], vec![]), "{id}");
    }
    let (none, dropped) = sent(fixture("blocks/stat.json"), tap("open"));
    assert_eq!((none, dropped), (vec![], vec!["tap open".to_owned()]));
    let ids = Ids {
        blocks: vec!["save".into()],
        actions: vec!["save".into()],
    };
    let mut run = Desk::new(serde_json::from_value(fixture("blocks/button.json")).unwrap()).run(&[]);
    run.check(&Want {
        tree: None,
        ids: Some(ids),
    });
    assert!(run.faults.is_empty(), "{:?}", run.faults);
}

#[test]
fn the_behave_screen_through_the_stage_hides_disables_and_sets_as_the_crate_says() {
    let screen = fixture("behave/view.json")["screen"].clone();
    let mut run = Desk::new(serde_json::from_value(screen).unwrap()).run(&steps(json!([
        {"shot": {"name": "start"}},
        {"tap": {"id": "save"}},
        {"tap": {"id": "more"}},
        {"shot": {"name": "more"}},
        {"tap": {"id": "more"}},
        {"tap": {"id": "save"}}
    ])));
    run.check(&Want::default());
    assert!(run.faults.is_empty(), "{:?}", run.faults);
    let drawn = |i: usize| -> Vec<(String, Drawn)> {
        run.shots[i]
            .tree
            .children
            .iter()
            .map(|c| (c.id.clone().unwrap(), c.drawn))
            .collect()
    };
    let hidden = |i: usize| -> Vec<String> {
        drawn(i)
            .into_iter()
            .filter(|(_, d)| *d == Drawn::Hidden)
            .map(|(id, _)| id)
            .collect()
    };
    assert_eq!(hidden(0), ["plans", "box"]);
    assert_eq!(hidden(1), Vec::<String>::new());
    assert_eq!(run.report.dropped, ["tap save", "tap more"]);
    let sent: Vec<_> = run.report.sent.iter().map(|a| a.action.as_str()).collect();
    assert_eq!(sent, ["save"]);
}

#[test]
fn a_scripted_type_then_submit_sends_the_typed_values_and_no_secret_reaches_the_tree() {
    let mut form = fixture("blocks/form.json");
    let key = json!({"type": "secret", "name": "key", "label": "Key"});
    form["fields"].as_array_mut().unwrap().push(key);
    form["submit"] = json!({"label": "Sign up", "action": "sign-up", "values": {"plan": "free"}});
    let script = json!([
        {"type": {"id": "signup", "text": "ada@example.com"}},
        {"type": {"id": "key", "text": "hunter2-secret"}},
        {"shot": {"name": "typed"}},
        {"tap": {"id": "signup"}},
        {"shot": {"name": "sent"}}
    ]);
    let mut run = Desk::new(serde_json::from_value(form).unwrap()).run(&steps(script));
    run.check(&Want::default());
    assert!(run.faults.is_empty(), "{:?}", run.faults);
    let want = json!({"screen": "signup", "block": "signup", "action": "sign-up",
        "values": {"plan": "free", "email": "ada@example.com", "key": "hunter2-secret"}});
    let sent: Vec<_> = run
        .report
        .sent
        .iter()
        .map(|a| serde_json::to_value(a).unwrap())
        .collect();
    assert_eq!((sent, run.report.dropped.clone()), (vec![want], vec![]));
    for s in &run.shots {
        let tree = serde_json::to_string(&s.tree).unwrap();
        assert!(!tree.contains("hunter2"), "{tree}");
    }
    assert_eq!(run.shots[0].ids.actions, ["sign-up"]);
}

#[test]
fn a_secret_block_sends_what_was_typed_once() {
    let script = json!([
        {"tap": {"id": "token"}},
        {"type": {"id": "token", "text": "s3cret"}},
        {"tap": {"id": "token"}},
        {"tap": {"id": "token"}},
        {"shot": {"name": "s"}}
    ]);
    let want = json!({"screen": "token", "block": "token", "action": "save-token", "values": {"token": "s3cret"}});
    assert_eq!(sent(fixture("blocks/secret.json"), script), (vec![want], vec![]));
}

#[test]
fn a_failing_check_holds_the_submit_until_a_typed_value_passes_it() {
    let screen = fixture("behave/view.json")["screen"].clone();
    let script = json!([
        {"tap": {"id": "join"}},
        {"type": {"id": "email", "text": "not an address"}},
        {"tap": {"id": "join"}},
        {"type": {"id": "email", "text": "ada@example.com"}},
        {"tap": {"id": "join"}},
        {"type": {"id": "seats", "text": "4"}},
        {"shot": {"name": "s"}}
    ]);
    let want = json!({"screen": "signup", "block": "join", "action": "join",
        "values": {"email": "ada@example.com", "name": "", "news": false}});
    let dropped = ["tap join", "tap join", "type seats"].map(String::from).to_vec();
    assert_eq!(sent(screen, script), (vec![want], dropped));
}

#[test]
fn a_config_sends_each_committed_field_on_its_own() {
    let mut config = fixture("blocks/config.json");
    config["fields"]
        .as_array_mut()
        .unwrap()
        .push(json!({"type": "text", "name": "branch"}));
    let script = json!([
        {"type": {"id": "repo", "text": "blocks"}},
        {"type": {"id": "branch", "text": "main"}},
        {"tap": {"id": "settings"}},
        {"shot": {"name": "s"}}
    ]);
    let want = json!({"screen": "settings", "block": "settings", "action": "save", "values": {"repo": "blocks"}});
    assert_eq!(sent(config, script), (vec![want], vec!["tap settings".to_owned()]));
}

fn find<'a>(n: &'a Node, id: &str) -> Option<&'a Node> {
    if n.id.as_deref() == Some(id) {
        return Some(n);
    }
    n.children.iter().find_map(|c| find(c, id))
}

#[test]
fn the_thread_script_lands_its_ops_and_the_opened_tool_stays_open() {
    let screen: Block = serde_json::from_value(fixture("append/thread.screen.json")).unwrap();
    let script = steps(fixture("append/thread.steps.json"));
    let mut run = Desk::new(screen.clone()).size(1440, 900).run(&script);
    assert_eq!(run.report.dropped, Vec::<String>::new());
    run.check(&Want::default());
    assert!(run.faults.is_empty(), "{:?}", run.faults);

    let mut applied = screen.clone();
    for s in &script {
        if let Step::Frame(f) = s {
            blocks::apply(&mut applied, f.ops.as_deref().unwrap_or_default()).unwrap();
        }
    }
    let built = Built::new(serde_json::to_value(&applied).unwrap());
    let want = expect(&built, &blocks_desktop::kinds(), &start(&built));
    let tree = &run.shots[0].tree;
    assert_eq!(check(Some(tree), &want, "after"), Vec::<String>::new());
    assert_eq!(find(tree, "t7-d").unwrap().variant.as_deref(), Some("done"));

    let fresh = Desk::new(applied)
        .size(1440, 900)
        .run(&steps(json!([{"tap": {"id": "t7-b"}}, {"shot": {"name": "after"}}])));
    assert_eq!(*tree, fresh.shots[0].tree);

    let folded = Desk::new(screen).size(1440, 900).run(&script[1..]);
    let tall = |t: &Node| find(t, "t7-b").unwrap().rect.unwrap()[3];
    let (open, shut) = (tall(tree), tall(&folded.shots[0].tree));
    assert!(open > shut + 44.0, "opened {open}, folded {shut}");
}
