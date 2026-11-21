use blocks::{apply, ApplyError, Block, Op};
use serde_json::{json, Value};

fn screen() -> Block {
    serde_json::from_value(json!({"type": "screen", "id": "s", "blocks": [
        {"type": "scene", "id": "sc", "lanes": [
            {"id": "l-722", "title": "#722", "state": "idle"},
            {"id": "l-708", "title": "#708", "state": "idle"}
        ]},
        {"type": "list", "id": "q", "rows": [{"type": "row", "id": "r", "title": "#722", "rounds": [
            {"id": "r-722-impl", "name": "impl", "state": "working"},
            {"id": "r-722-rev", "name": "rev", "state": "idle"}
        ]}]}
    ]}))
    .unwrap()
}

fn ops(v: Value) -> Vec<Op> {
    serde_json::from_value(v).unwrap()
}

#[test]
fn merge_replace_and_remove_reach_a_scenes_lanes_and_a_rows_rounds() {
    let mut s = screen();
    apply(
        &mut s,
        &ops(json!([
            {"op": "merge", "id": "l-722", "fields": {"state": "working"}},
            {"op": "merge", "id": "r-722-impl", "fields": {"state": "done"}},
            {"op": "replace", "id": "l-708", "block": {"id": "l-708", "title": "#708", "state": "done"}},
            {"op": "replace", "id": "r-722-rev", "block": {"id": "r-722-rev", "name": "rev", "state": "needs"}},
            {"op": "remove", "id": "l-722"},
            {"op": "remove", "id": "r-722-impl"}
        ])),
    )
    .unwrap();
    let got = serde_json::to_value(&s).unwrap();
    assert_eq!(
        got["blocks"][0]["lanes"],
        json!([{"id": "l-708", "title": "#708", "state": "done"}])
    );
    assert_eq!(
        got["blocks"][1]["rows"][0]["rounds"],
        json!([{"id": "r-722-rev", "name": "rev", "state": "needs"}])
    );
}

#[test]
fn a_replace_with_another_kind_of_child_does_not_fit() {
    let lane = json!({"id": "x", "title": "x", "state": "idle"});
    for id in ["sc", "r-722-impl"] {
        let mut s = screen();
        let err = apply(&mut s, &ops(json!([{"op": "replace", "id": id, "block": lane}])));
        assert!(matches!(err, Err(ApplyError::Shape(_))), "{id}: {err:?}");
    }
    let mut s = screen();
    let err = apply(&mut s, &ops(json!([{"op": "merge", "id": "gone", "fields": {}}])));
    assert_eq!(err, Err(ApplyError::NoBlock("gone".into())));
}
