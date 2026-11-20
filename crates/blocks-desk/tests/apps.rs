use std::cell::RefCell;
use std::rc::Rc;

use blocks::tree::{Drawn, Node, Step};
use blocks::{Action, Block, Tone};
use blocks_desk::{Desk, Echo, Want, ECHO};
use blocks_desktop::{Clash, Kit, Look};
use serde_json::json;

fn screen(blocks: &serde_json::Value) -> Block {
    serde_json::from_value(json!({"type": "screen", "id": "s", "blocks": blocks})).unwrap()
}

fn steps(v: serde_json::Value) -> Vec<Step> {
    serde_json::from_value(v).unwrap()
}

fn find<'a>(n: &'a Node, id: &str) -> &'a Node {
    fn at<'a>(n: &'a Node, id: &str) -> Option<&'a Node> {
        if n.id.as_deref() == Some(id) {
            return Some(n);
        }
        n.children.iter().find_map(|c| at(c, id))
    }
    at(n, id).unwrap()
}

#[test]
fn the_echo_island_mounts_in_its_box_takes_its_props_and_sends_only_its_named_events() {
    let props = json!({"send": "pick", "n": 1});
    let s = screen(&json!([
        {"type": "island", "id": "e", "name": ECHO, "fallback": {"title": "Echo"}, "props": props, "events": ["pick"], "size": {"height": 120}},
        {"type": "island", "id": "f", "name": ECHO, "fallback": {"title": "Echo"}, "props": {"send": "other"}, "events": ["pick"], "size": {"width": 200, "aspect": "2/1"}},
        {"type": "island", "id": "m", "name": "x-map", "fallback": {"title": "The map"}, "events": ["pick"]}
    ]));
    let mut run = Desk::new(s).run(&steps(json!([
        {"tap": {"id": "e"}}, {"tap": {"id": "f"}}, {"tap": {"id": "m"}}, {"shot": {"name": "s"}}
    ])));
    let pick = Action {
        screen: "s".into(),
        block: Some("e".into()),
        action: "pick".into(),
        values: serde_json::from_value(props).unwrap(),
    };
    assert_eq!(run.report.sent, [pick]);
    assert_eq!(run.report.dropped, ["event f other", "tap m"]);
    let tree = &run.shots[0].tree;
    let [_, _, w, h] = find(tree, "e").rect.unwrap();
    assert_eq!((w > 300.0, h), (true, 120.0));
    let [_, _, w, h] = find(tree, "f").rect.unwrap();
    assert_eq!((w, h), (200.0, 100.0));
    run.check(&Want::default());
    assert!(run.faults.is_empty(), "{:?}", run.faults);
}

#[test]
fn an_app_kind_draws_and_sends_and_one_nobody_registered_or_named_like_a_core_kind_draws_the_fallback() {
    let s = screen(&json!([
        {"type": "herd", "id": "h", "events": ["go"], "fallback": {"title": "Herd"}},
        {"type": "flock", "id": "k", "fallback": {"title": "Flock"}}
    ]));
    let kit = Kit::default()
        .kind("herd", |ui, b, out| {
            if ui.button(format!("{} herd", b.kind)).clicked() {
                out.send("go", serde_json::Map::new());
            }
        })
        .unwrap();
    let taps = steps(json!([{"tap": {"id": "h"}}, {"tap": {"id": "k"}}]));
    let run = Desk::new(s.clone()).kit(kit).run(&taps);
    let go = Action {
        screen: "s".into(),
        block: Some("h".into()),
        action: "go".into(),
        values: serde_json::Map::new(),
    };
    assert_eq!(run.report.sent, [go]);
    assert_eq!(run.report.dropped, ["tap k"]);
    let plain = Desk::new(s).run(&taps);
    assert_eq!(plain.report.sent, []);
    assert_eq!(plain.report.dropped, ["tap h", "tap k"]);
    for core in ["card", "island", "row"] {
        let refused = Kit::new(Look::default()).kind(core, |_, _, _| {}).err();
        assert_eq!(refused, Some(Clash { kind: core.into() }));
    }
}

#[test]
fn a_wrap_frames_every_drawn_block_of_its_kind_and_is_told_its_id_variant_and_tone() {
    let s = screen(&json!([
        {"type": "text", "id": "t", "text": "hello", "tone": "warn"},
        {"type": "hero", "id": "g", "title": "Gap"}
    ]));
    let seen = Rc::new(RefCell::new(vec![]));
    let log = Rc::clone(&seen);
    let kit = Kit::default().island(ECHO, || Box::new(Echo));
    let wrapped = ["text", "hero"].into_iter().fold(kit.clone(), |k, kind| {
        let log = Rc::clone(&log);
        k.wrap(kind, move |ui, st, content| {
            log.borrow_mut().push((
                st.kind.to_owned(),
                st.id.map(String::from),
                st.tone.clone(),
                st.fallback,
            ));
            egui::Frame::new().inner_margin(20).show(ui, |ui| content(ui));
        })
    });
    let shot = steps(json!([{"shot": {"name": "s"}}]));
    let mut run = Desk::new(s.clone()).kit(wrapped).run(&shot);
    let bare = Desk::new(s).kit(kit).run(&shot);
    let tall = |n: &Node, id| find(n, id).rect.unwrap()[3];
    assert_eq!(tall(&run.shots[0].tree, "t"), tall(&bare.shots[0].tree, "t") + 40.0);
    assert_eq!(find(&run.shots[0].tree, "g").drawn, Drawn::Fallback);
    assert_eq!(
        seen.borrow()[..2],
        [
            ("text".into(), Some("t".into()), Some(Tone::Warn), false),
            ("hero".into(), Some("g".into()), None, true)
        ]
    );
    run.check(&Want::default());
    assert!(run.faults.is_empty(), "{:?}", run.faults);
}
