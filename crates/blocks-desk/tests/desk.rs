use std::path::{Path, PathBuf};
use std::process::Command;

use blocks::tree::{Drawn, Node, Step};
use blocks::Block;
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
    assert_eq!(run.report.timings.steps_ms.len(), 8);
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
