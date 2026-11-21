use std::path::Path;

use blocks::{apply, diff, Block, Message, Op, Part, Prose, Role, Section};
use serde_json::{json, Value};

fn cases(dir: &str) -> Vec<(String, Value)> {
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures").join(dir);
    let mut out: Vec<(String, Value)> = std::fs::read_dir(dir)
        .unwrap()
        .map(|e| e.unwrap().path())
        .filter(|p| {
            p.extension().is_some_and(|x| x == "json")
                && !p.file_name().unwrap().to_string_lossy().starts_with("thread.")
        })
        .map(|p| {
            let v = serde_json::from_str(&std::fs::read_to_string(&p).unwrap()).unwrap();
            (p.file_name().unwrap().to_string_lossy().into_owned(), v)
        })
        .collect();
    out.sort_by(|a, b| a.0.cmp(&b.0));
    out
}

fn prose(id: &str, parts: Vec<Part>) -> Block {
    Block::Prose(Box::new(Prose::new(parts).id(id)))
}

fn thread(blocks: Vec<Block>) -> Block {
    let reply = Message::new(Role::Agent, "Scout").id("t7").blocks(blocks);
    Block::Section(Box::new(Section::new(vec![Block::Message(Box::new(reply))]).id("log")))
}

#[test]
fn append_runs_every_fixture_case() {
    let all = cases("append");
    assert!(all.len() >= 8);
    for (name, case) in all {
        let parts: Vec<Part> = serde_json::from_value(case["parts"].clone()).unwrap();
        let op: Op = serde_json::from_value(case["op"].clone()).unwrap();
        assert_eq!(
            serde_json::to_value(&op).unwrap(),
            case["op"],
            "{name}: the op round-trips"
        );
        let mut got = thread(vec![prose("p", parts)]);
        let res = apply(&mut got, &[op]);
        match case["want"].as_array() {
            Some(_) => {
                let want: Vec<Part> = serde_json::from_value(case["want"].clone()).unwrap();
                res.unwrap_or_else(|e| panic!("{name}: {e}"));
                assert_eq!(got, thread(vec![prose("p", want)]), "{name}");
            }
            None => assert!(matches!(res, Err(blocks::ApplyError::Shape(_))), "{name}: {res:?}"),
        }
    }
}

#[test]
fn append_on_a_block_that_is_no_prose_does_not_fit() {
    let mut s = thread(vec![prose("p", vec![])]);
    let op: Op = serde_json::from_value(json!({"op": "append", "id": "t7", "text": "x"})).unwrap();
    assert!(matches!(apply(&mut s, &[op]), Err(blocks::ApplyError::Shape(_))));
}

#[test]
fn read_gives_every_fixture_its_parts() {
    let all = cases("read");
    assert!(all.len() >= 10);
    for (name, case) in all {
        let want: Vec<Part> = serde_json::from_value(case["parts"].clone()).unwrap();
        assert_eq!(Prose::read(case["markdown"].as_str().unwrap()), want, "{name}");
    }
}

const REPLY: &str = "I will read the **two files** first, then run `cargo test`.\n\n\
- patch.rs\n- diff.rs\n\n```rust\nfn grow() {\n    todo();\n}\n```\n\nAll [green](https://ci.dev).";

fn streamed(upto: &str, writing: bool) -> Block {
    let p = Prose::new(Prose::read(upto)).id("t7-a");
    thread(vec![Block::Prose(Box::new(if writing {
        p.streaming(true)
    } else {
        p
    }))])
}

#[test]
fn diff_streams_a_reply_as_appends_that_carry_only_what_changed() {
    let cuts: Vec<usize> = REPLY
        .char_indices()
        .map(|(i, _)| i)
        .step_by(3)
        .chain([REPLY.len()])
        .collect();
    let mut was = streamed("", true);
    let (mut texts, mut sent, mut merged) = (0, 0, 0);
    for at in cuts {
        let now = streamed(&REPLY[..at], true);
        let ops = diff(&was, &now);
        let mut got = was.clone();
        apply(&mut got, &ops).unwrap();
        assert_eq!(got, now, "at {at}");
        for op in &ops {
            match op {
                Op::Append {
                    keep: None,
                    parts,
                    text,
                    ..
                } => {
                    assert!(parts.is_empty() && !text.is_empty());
                    texts += 1;
                }
                Op::Append { keep: Some(_), .. } => {}
                other => panic!("at {at}: {other:?}"),
            }
            let size = serde_json::to_string(op).unwrap().len();
            assert!(size < 300, "at {at}: a {size}-byte op");
            sent += size;
        }
        merged += serde_json::to_string(&Prose::read(&REPLY[..at])).unwrap().len();
        was = now;
    }
    assert!(texts > 20, "{texts} text appends");
    assert!(
        sent * 3 < merged,
        "{sent} bytes, where a merge of the parts sends {merged}"
    );
    let done = streamed(REPLY, false);
    assert_eq!(
        serde_json::to_value(diff(&was, &done)).unwrap(),
        json!([{"op": "merge", "id": "t7-a", "fields": {"streaming": null}}])
    );
}

#[test]
fn diff_writes_text_alone_when_only_the_last_text_grew_and_merge_first() {
    let p = |t: &str| {
        let spans = vec![blocks::Span {
            text: t.into(),
            ..Default::default()
        }];
        vec![Part::Rule, Part::Para { spans }]
    };
    let old = thread(vec![prose("t7-a", p("I will"))]);
    let grown = Prose::new(p("I will read")).id("t7-a").streaming(true);
    let new = thread(vec![Block::Prose(Box::new(grown))]);
    assert_eq!(
        serde_json::to_value(diff(&old, &new)).unwrap(),
        json!([
            {"op": "merge", "id": "t7-a", "fields": {"streaming": true}},
            {"op": "append", "id": "t7-a", "text": " read"}
        ])
    );
}

#[test]
fn a_tool_that_changes_is_one_merge_and_a_new_one_an_insert_into_the_message() {
    let tool = |state: &str| {
        serde_json::from_value::<Block>(json!({"type": "tool", "id": "t7-b", "name": "Read", "state": state})).unwrap()
    };
    let old = thread(vec![prose("t7-a", vec![]), tool("running")]);
    let new = thread(vec![prose("t7-a", vec![]), tool("done")]);
    assert_eq!(
        serde_json::to_value(diff(&old, &new)).unwrap(),
        json!([{"op": "merge", "id": "t7-b", "fields": {"state": "done"}}])
    );
    let more = thread(vec![prose("t7-a", vec![]), tool("done"), prose("t7-c", vec![])]);
    let ops = serde_json::to_value(diff(&new, &more)).unwrap();
    assert_eq!(ops[0]["op"], "insert");
    assert_eq!(ops[0]["into"], "t7");
}

#[test]
fn old_turns_an_append_into_a_merge_of_the_parts() {
    let was = streamed("I will", true);
    let now = streamed("I will read", true);
    let ops = blocks::wire::old(diff(&was, &now), &now);
    let Block::Section(s) = &now else { panic!() };
    let Some(Block::Message(m)) = s.blocks.first() else {
        panic!()
    };
    let Some(Block::Prose(p)) = m.blocks.as_ref().unwrap().first() else {
        panic!()
    };
    assert_eq!(
        serde_json::to_value(&ops).unwrap(),
        json!([{"op": "merge", "id": "t7-a", "fields": {"parts": p.parts}}])
    );
    let mut got = was.clone();
    apply(&mut got, &ops).unwrap();
    assert_eq!(got, now);
}

#[test]
fn the_thread_script_applies_to_its_screen() {
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/append");
    let read = |f: &str| -> Value { serde_json::from_str(&std::fs::read_to_string(dir.join(f)).unwrap()).unwrap() };
    let mut s: Block = serde_json::from_value(read("thread.screen.json")).unwrap();
    assert_eq!(blocks::Built::new(serde_json::to_value(&s).unwrap()).check(&[]), vec![]);
    for step in read("thread.steps.json").as_array().unwrap() {
        if let Some(ops) = step.get("frame").map(|f| f["ops"].clone()) {
            apply(&mut s, &serde_json::from_value::<Vec<Op>>(ops).unwrap()).unwrap();
        }
    }
    let v = serde_json::to_value(&s).unwrap();
    let reply = &v["blocks"][0]["blocks"][2]["blocks"];
    assert_eq!(reply[2]["parts"][1]["text"], "grow(keep, parts, text)");
    assert_eq!(reply[2].get("streaming"), None);
    assert_eq!(reply[3]["state"], "done");
}
