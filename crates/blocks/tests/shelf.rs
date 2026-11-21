use blocks::{wire, Block, Child, Frame, Op, Put, Shelf};
use serde_json::json;

fn screen(rows: &[(&str, &str)]) -> Block {
    let rows: Vec<_> = rows
        .iter()
        .map(|(id, t)| json!({"type": "row", "id": id, "title": t}))
        .collect();
    serde_json::from_value(
        json!({"type": "screen", "id": "s", "title": "Q", "blocks": [{"type": "list", "id": "l", "rows": rows}]}),
    )
    .unwrap()
}

fn delta(p: Put) -> Frame {
    match p {
        Put::Changed(d) => {
            let f: Frame = serde_json::from_str(&d.frame).unwrap();
            assert_eq!((f.from.unwrap_or(d.from), f.rev), (d.from, d.rev));
            f
        }
        other => panic!("no change: {other:?}"),
    }
}

#[test]
fn a_put_is_first_then_same_then_a_delta_on_the_rev_before() {
    let mut shelf = Shelf::default();
    let a = screen(&[("a", "A")]);
    assert_eq!(shelf.put(&1, "/q", &a).unwrap(), Put::First);
    assert_eq!(shelf.put(&1, "/q", &a).unwrap(), Put::Same);
    let f = delta(shelf.put(&1, "/q", &screen(&[("a", "A2")])).unwrap());
    assert_eq!((f.k.as_str(), f.from, f.rev), ("/q", Some(1), 2));
    assert!(f.screen.is_none());
    assert_eq!(f.ops.unwrap().len(), 1);
}

#[test]
fn a_state_is_current_the_rings_ops_the_whole_screen_or_gone() {
    let mut shelf = Shelf::default();
    shelf.put(&"q", "/q", &screen(&[("a", "A")])).unwrap();
    shelf.put(&"q", "/q", &screen(&[("a", "A"), ("b", "B")])).unwrap();
    let last = screen(&[("b", "B"), ("a", "A")]);
    shelf.put(&"q", "/q", &last).unwrap();
    let now = shelf.state(&"q", "/q", Some(3)).unwrap();
    assert_eq!((now.rev, &now.ops, &now.screen), (Some(3), &None, &None));
    let mut from1: Block = screen(&[("a", "A")]);
    blocks::apply(&mut from1, &shelf.state(&"q", "/q", Some(1)).unwrap().ops.unwrap()).unwrap();
    assert_eq!(from1, last);
    assert_eq!(shelf.state(&"q", "/q", None).unwrap().screen, Some(last.clone()));
    assert_eq!(shelf.state(&"q", "/q", Some(9)).unwrap().screen, Some(last));
    assert_eq!(shelf.state(&"x", "/x", None).unwrap().gone, Some(404));
    shelf.forget(&"q");
    assert_eq!(shelf.state(&"q", "/q", Some(3)).unwrap().gone, Some(404));
}

#[test]
fn the_ring_keeps_sixteen_deltas_and_a_whole_screen_change_clears_it() {
    let mut shelf = Shelf::default();
    shelf.put(&0, "/q", &screen(&[("a", "0")])).unwrap();
    for i in 1..=20 {
        shelf.put(&0, "/q", &screen(&[("a", &i.to_string())])).unwrap();
    }
    assert!(shelf.state(&0, "/q", Some(4)).unwrap().screen.is_some());
    assert!(shelf.state(&0, "/q", Some(5)).unwrap().ops.is_some());
    let other: Block = serde_json::from_value(json!({"type": "screen", "id": "t", "title": "T"})).unwrap();
    let f = delta(shelf.put(&0, "/q", &other).unwrap());
    assert_eq!((f.from, f.ops, f.screen.as_ref()), (None, None, Some(&other)));
    assert!(shelf.state(&0, "/q", Some(20)).unwrap().screen.is_some());
}

#[test]
fn old_turns_a_move_into_a_replace_of_its_parent_and_of_the_root_into_the_screen() {
    let new = screen(&[("b", "B"), ("a", "A")]);
    let mv = |into: &str| Op::Move {
        id: "b".into(),
        into: into.into(),
        before: Some("a".into()),
    };
    let ins = Op::Insert {
        into: "l".into(),
        before: None,
        after: None,
        block: blocks::Child::Block(screen(&[])),
    };
    let rm = Op::Remove { id: "c".into() };
    let l = match &new {
        Block::Screen(s) => s.blocks.as_ref().unwrap()[0].clone(),
        _ => unreachable!(),
    };
    assert_eq!(
        wire::old(vec![rm.clone(), mv("l"), mv("l"), ins], &new),
        vec![
            rm.clone(),
            Op::Replace {
                id: "l".into(),
                block: Child::Block(l)
            }
        ]
    );
    assert_eq!(wire::old(vec![mv("s")], &new), vec![Op::Screen { screen: new.clone() }]);
    assert_eq!(wire::old(vec![rm.clone()], &new), vec![rm]);
}
