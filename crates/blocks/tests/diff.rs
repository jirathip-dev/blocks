use blocks::{apply, diff, Block, Child, Op};
use serde_json::{json, Value};

fn row(n: u32, title: &str) -> Value {
    json!({"type": "row", "id": format!("q-sendmeter-{n}"), "title": title, "subtitle": "impl"})
}

fn queue(badge: u64, done: &str, progress: &[Value], queued: &[Value]) -> Block {
    serde_json::from_value(json!({
        "type": "screen",
        "id": "queue-sendmeter",
        "title": "sendmeter",
        "badge": badge,
        "blocks": [
            {"type": "section", "id": "stats-sendmeter", "blocks": [
                {"type": "stat", "id": "done-today-sendmeter", "label": "done today", "value": done},
                {"type": "stat", "id": "queued-sendmeter", "label": "queued", "value": "2"}
            ]},
            {"type": "section", "id": "inprogress-sendmeter", "header": "In progress", "blocks": [
                {"type": "list", "id": "inprogress-list-sendmeter", "rows": progress}
            ]},
            {"type": "section", "id": "queued-section-sendmeter", "header": "Queued", "blocks": [
                {"type": "list", "id": "queued-list-sendmeter", "rows": queued}
            ]}
        ]
    }))
    .unwrap()
}

fn wire(ops: &[Op]) -> Vec<Value> {
    ops.iter().map(|o| serde_json::to_value(o).unwrap()).collect()
}

fn applied(old: &Block, new: &Block) -> Vec<Op> {
    let ops = diff(old, new);
    let mut got = old.clone();
    apply(&mut got, &ops).unwrap();
    assert_eq!(&got, new);
    ops
}

#[test]
fn the_queue_stream_updates_rows_in_place_and_the_strip_count() {
    let first = queue(
        2,
        "0",
        &[row(12, "send meter")],
        &[row(5, "fix the gauge"), row(9, "docs")],
    );

    let renamed = queue(
        2,
        "0",
        &[row(12, "send meter v2")],
        &[row(5, "fix the gauge"), row(9, "docs")],
    );
    assert_eq!(
        wire(&applied(&first, &renamed)),
        [json!({"op": "merge", "id": "q-sendmeter-12", "fields": {"title": "send meter v2"}})]
    );

    let landed = queue(1, "1", &[row(12, "send meter v2")], &[row(9, "docs")]);
    let ops = wire(&applied(&renamed, &landed));
    assert_eq!(ops.len(), 3, "{ops:?}");
    assert!(ops.contains(&json!({"op": "badge", "count": 1})), "{ops:?}");
    assert!(ops.contains(&json!({"op": "remove", "id": "q-sendmeter-5"})), "{ops:?}");
    assert!(
        ops.contains(&json!({"op": "merge", "id": "done-today-sendmeter", "fields": {"value": "1"}})),
        "{ops:?}"
    );

    let started = queue(
        1,
        "1",
        &[row(12, "send meter v2"), row(17, "new lane")],
        &[row(9, "docs")],
    );
    let ops = applied(&landed, &started);
    assert!(
        matches!(ops.as_slice(), [Op::Insert { into, block: Child::Block(b), .. }]
            if into == "inprogress-list-sendmeter" && b.id() == Some("q-sendmeter-17")),
        "{ops:?}"
    );
}

#[test]
fn a_badge_alone_is_a_badge_op_and_a_removed_badge_is_a_screen() {
    let a = queue(2, "0", &[row(12, "a")], &[]);
    let b = queue(7, "0", &[row(12, "a")], &[]);
    assert_eq!(wire(&applied(&a, &b)), [json!({"op": "badge", "count": 7})]);
    let mut c = serde_json::to_value(&a).unwrap();
    c.as_object_mut().unwrap().remove("badge");
    let c: Block = serde_json::from_value(c).unwrap();
    assert!(matches!(applied(&a, &c).as_slice(), [Op::Screen { .. }]));
}

#[test]
fn a_nested_kind_change_replaces_only_that_block_and_a_title_change_is_a_screen() {
    let a = queue(2, "0", &[row(12, "a")], &[]);
    let mut v = serde_json::to_value(&a).unwrap();
    v["blocks"][0]["blocks"][1] = json!({"type": "text", "id": "queued-sendmeter", "markdown": "2 queued"});
    let b: Block = serde_json::from_value(v.clone()).unwrap();
    assert!(
        matches!(applied(&a, &b).as_slice(), [Op::Replace { id, .. }] if id == "queued-sendmeter"),
        "{:?}",
        diff(&a, &b)
    );
    v["title"] = json!("other");
    let c: Block = serde_json::from_value(v).unwrap();
    assert!(matches!(applied(&a, &c).as_slice(), [Op::Screen { .. }]));
}
