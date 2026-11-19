use std::path::{Path, PathBuf};

use blocks::gesture::{step, Effect, Event, Nudge, Phase, Rules};
use blocks::{
    Action, BarGrab, BarPart, Block, Built, DaySpan, Days, Fault, List, MarkChange, MarkGrab, MarkReach, Media, Timeline,
};
use serde::Deserialize;
use serde_json::{json, Value};

type Out = (Phase<Value>, Option<Effect<Value>>);

#[derive(Deserialize)]
struct Case {
    start: Value,
    events: Vec<Event<Value>>,
    want: Vec<Out>,
}

fn at(p: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../fixtures/gesture")
        .join(p)
}

fn read(p: &str) -> Value {
    serde_json::from_str(&std::fs::read_to_string(at(p)).unwrap()).unwrap()
}

fn run(start: &Value, events: &[Event<Value>]) -> Vec<Out> {
    let mut phase = Phase::Idle;
    let mut out = vec![];
    for e in events {
        let (next, effect) = step(phase, e.clone(), start);
        out.push((next.clone(), effect));
        phase = next;
    }
    out
}

#[test]
fn the_machine_takes_every_transition_of_the_statechart() {
    let cases: Vec<Case> = serde_json::from_value(read("machine.json")["cases"].clone()).unwrap();
    assert!(cases.len() >= 10);
    for (i, c) in cases.iter().enumerate() {
        assert_eq!(run(&c.start, &c.events), c.want, "case {i}");
    }
}

fn event(r: &mut u64) -> Event<Value> {
    *r = r
        .wrapping_mul(6_364_136_223_846_793_005)
        .wrapping_add(1_442_695_040_888_963_407);
    let n = *r >> 33;
    let c = || (!n.is_multiple_of(5)).then(|| Value::from(n % 4));
    match n % 9 {
        0 | 1 => Event::Press,
        2 | 3 => Event::Move { c: c() },
        4 | 5 => Event::Release,
        6 => Event::Cancel,
        7 => Event::Answer {
            ok: n.is_multiple_of(2),
            why: n.is_multiple_of(3).then(|| "No".into()),
        },
        _ => Event::Settled,
    }
}

fn sim() -> String {
    let cases: Vec<String> = (1..=100_u64)
        .map(|seed| {
            let mut r = seed;
            let events: Vec<Event<Value>> = (0..16).map(|_| event(&mut r)).collect();
            let want = run(&json!(0), &events);
            json!({ "seed": seed, "start": 0, "events": events, "want": want }).to_string()
        })
        .collect();
    format!("{{\n  \"cases\": [\n    {}\n  ]\n}}\n", cases.join(",\n    "))
}

#[test]
fn the_generated_sim_is_the_machine_on_the_fixed_seeds() {
    let want = sim();
    if std::env::var_os("BLOCKS_GEN").is_some() {
        std::fs::write(at("sim.json"), &want).unwrap();
    }
    let got = std::fs::read_to_string(at("sim.json")).unwrap_or_default();
    assert!(
        got == want,
        "fixtures/gesture/sim.json is not what the machine gives: run `just gen`"
    );
}

#[derive(Deserialize)]
struct RuleCase {
    grab: String,
    reach: Option<i64>,
    nudges: Option<Vec<Nudge>>,
    want: Option<Vec<String>>,
    says: Option<String>,
}

#[test]
fn list_rules_give_each_fixture_case_its_order_its_words_and_its_steps() {
    let f = read("list.json");
    let list: List = serde_json::from_value(f["block"].clone()).unwrap();
    let cases: Vec<RuleCase> = serde_json::from_value(f["cases"].clone()).unwrap();
    for c in &cases {
        let got = match (&c.reach, &c.nudges) {
            (Some(r), _) => list.candidate(&c.grab, r),
            (None, Some(ns)) => ns
                .iter()
                .try_fold(list.start(&c.grab).unwrap(), |from, n| list.nudge(&c.grab, &from, *n)),
            (None, None) => panic!("a case with neither reach nor nudges"),
        };
        assert_eq!(got, c.want, "{} {:?} {:?}", c.grab, c.reach, c.nudges);
        let said = got.as_ref().map(|g| list.says(&c.grab, g));
        assert_eq!(said, c.says, "{}", c.grab);
    }
    for (grab, want) in f["steps"].as_object().unwrap() {
        let names: Vec<String> = list.steps(grab).into_iter().map(|(n, _)| n).collect();
        assert_eq!(json!(names), *want, "{grab}");
    }
}

#[test]
fn an_action_reads_a_gesture_result_by_its_name() {
    let a: Action =
        serde_json::from_value(json!({"screen": "s", "action": "order", "values": {"accounts": ["b", "a"]}})).unwrap();
    assert_eq!(a.read::<Vec<String>>("accounts").unwrap(), vec!["b", "a"]);
    assert!(a.read::<Vec<String>>("rows").is_err());
    assert!(a.read::<u8>("accounts").is_err());
}

fn faults(list: &Value) -> Vec<Fault> {
    Built::new(json!({"type": "screen", "id": "s", "title": "S", "blocks": [list]})).check(&[])
}

#[test]
fn a_gesture_needs_its_block_id_and_two_gestures_may_send_one_action() {
    let reorder = json!({"action": "order", "name": "ids"});
    let rows = json!([{"type": "row", "id": "a", "title": "A", "handle": true}]);
    let bare = faults(&json!({"type": "list", "rows": rows, "reorder": reorder}));
    assert_eq!(bare, vec![Fault::Unnamed { kind: "list".into() }]);
    assert_eq!(
        faults(&json!({"type": "list", "id": "l", "rows": rows, "reorder": reorder})),
        vec![]
    );
    let shared = json!({"type": "list", "id": "l", "rows": rows, "reorder": reorder, "move": reorder, "fallback": {"title": "l"}});
    assert_eq!(
        faults(&shared),
        vec![Fault::Extra {
            kind: "list".into(),
            field: "move".into()
        }]
    );
    let with_act = json!({"type": "list", "id": "l", "rows": [{"type": "row", "title": "A", "swipe": [{"label": "Go", "action": "order"}]}], "reorder": reorder});
    assert!(matches!(faults(&with_act).as_slice(), [Fault::ActTwice { .. }]));
}

#[test]
fn a_gesture_whose_enabled_does_not_hold_joins_the_view_acts() {
    let reorder = json!({"action": "order", "name": "ids", "enabled": {"get": "edit"}});
    let s = Built::new(
        json!({"type": "screen", "id": "s", "title": "S", "state": {"edit": false},
        "blocks": [{"type": "list", "id": "l", "rows": [], "reorder": reorder}]}),
    );
    let off = blocks::behave::view(&s, &blocks::behave::start(&s));
    assert!(off.acts.contains("order"));
    let on = blocks::behave::view(&s, &[("edit".into(), blocks::expr::Lit::Bool(true))].into());
    assert!(!on.acts.contains("order"));
    assert!(
        matches!(serde_json::from_value::<Block>(json!({"type": "list", "rows": [], "reorder": reorder})), Ok(Block::List(l)) if l.reorder.as_ref().is_some_and(|g| g.enabled.is_some()))
    );
}

#[derive(Deserialize)]
struct MarkCase {
    grab: MarkGrab,
    reach: Option<MarkReach>,
    nudges: Option<Vec<Nudge>>,
    want: Option<MarkChange>,
    says: Option<String>,
}

#[test]
fn media_rules_give_each_fixture_case_its_change_its_words_its_steps_and_its_names() {
    let f = read("media.json");
    let media: Media = serde_json::from_value(f["block"].clone()).unwrap();
    let cases: Vec<MarkCase> = serde_json::from_value(f["cases"].clone()).unwrap();
    assert!(cases.len() >= 20);
    for c in &cases {
        let got = match (&c.reach, &c.nudges) {
            (Some(r), _) => media.candidate(&c.grab, r),
            (None, Some(ns)) => ns.iter().try_fold(media.start(&c.grab).unwrap_or_default(), |from, n| {
                media.nudge(&c.grab, &from, *n)
            }),
            (None, None) => panic!("a case with neither reach nor nudges"),
        };
        assert_eq!(got, c.want, "{:?} {:?} {:?}", c.grab, c.reach, c.nudges);
        let said = got.as_ref().map(|g| media.says(&c.grab, g));
        assert_eq!(said, c.says, "{:?}", c.grab);
    }
    for s in f["steps"].as_array().unwrap() {
        let grab: MarkGrab = serde_json::from_value(s["grab"].clone()).unwrap();
        let names: Vec<String> = media.steps(&grab).into_iter().map(|(n, _)| n).collect();
        assert_eq!(json!(names), s["want"], "{grab:?}");
    }
    for (id, want) in f["names"].as_object().unwrap() {
        assert_eq!(json!(media.named(id)), *want, "{id}");
    }
    let screen = json!({"type": "screen", "id": "s", "title": "S", "blocks": [f["block"]]});
    assert_eq!(Built::new(screen).check(&[]), vec![]);
}

#[derive(Deserialize)]
struct TimeCase {
    grab: BarGrab,
    reach: Option<Days>,
    nudges: Option<Vec<Nudge>>,
    want: Option<DaySpan>,
    says: Option<String>,
}

#[test]
fn timeline_rules_give_each_fixture_case_its_span_its_words_and_its_steps() {
    let f = read("timeline.json");
    let t: Timeline = serde_json::from_value(f["block"].clone()).unwrap();
    let cases: Vec<TimeCase> = serde_json::from_value(f["cases"].clone()).unwrap();
    assert!(cases.len() >= 30);
    for c in &cases {
        let got = match (&c.reach, &c.nudges) {
            (Some(r), _) => t.candidate(&c.grab, r),
            (None, Some(ns)) => t
                .start(&c.grab)
                .and_then(|s| ns.iter().try_fold(s, |from, n| t.nudge(&c.grab, &from, *n))),
            (None, None) => panic!("a case with neither reach nor nudges"),
        };
        assert_eq!(got, c.want, "{:?} {:?} {:?}", c.grab, c.reach, c.nudges);
        assert_eq!(got.as_ref().map(|g| t.says(&c.grab, g)), c.says, "{:?}", c.grab);
    }
    for s in f["steps"].as_array().unwrap() {
        let grab: BarGrab = serde_json::from_value(s["grab"].clone()).unwrap();
        let names: Vec<String> = t.steps(&grab).into_iter().map(|(n, _)| n).collect();
        assert_eq!(json!(names), s["want"], "{grab:?}");
    }
    let fixed = BarGrab::Bar {
        bar: "b8".into(),
        part: BarPart::Body,
    };
    assert_eq!((t.word(&fixed), t.start(&fixed)), (None, None));
    let a: Action = serde_json::from_value(
        json!({"screen": "s", "action": "schedule", "values": {"bar": {"id": "b7", "start": "2026-12-06", "end": "2026-12-08"}}}),
    )
    .unwrap();
    let sent: DaySpan = a.read("bar").unwrap();
    assert_eq!(sent.id.as_deref(), Some("b7"));
}

#[test]
fn a_timeline_with_a_gesture_needs_its_id_and_its_move_and_stretch_may_share_an_action() {
    let mut block = read("timeline.json")["block"].clone();
    assert_eq!(faults(&block), vec![]);
    block.as_object_mut().unwrap().remove("id");
    assert_eq!(
        faults(&block),
        vec![Fault::Unnamed {
            kind: "timeline".into()
        }]
    );
    let plain = json!({"type": "timeline", "from": "2026-12-01", "to": "2026-12-31", "tracks": []});
    assert_eq!(faults(&plain), vec![]);
}
