mod support;

use std::io::Write;
use std::time::{Duration, Instant};

use blocks::behave::{start, view};
use blocks::{apply, diff, Block, Built};
use support::{mutate, screen, Rng};

fn time<T>(runs: u32, mut f: impl FnMut() -> T) -> Duration {
    let mut batch = || {
        let start = Instant::now();
        for _ in 0..runs {
            std::hint::black_box(f());
        }
        start.elapsed() / runs
    };
    (0..5).map(|_| batch()).min().unwrap()
}

fn report(what: &str, took: Duration, budget: Duration) {
    let line = format!(
        "| {what} | {:.1} µs | {:.1} µs |",
        took.as_secs_f64() * 1e6,
        budget.as_secs_f64() * 1e6
    );
    println!("{line}");
    if let Ok(path) = std::env::var("GITHUB_STEP_SUMMARY") {
        let mut f = std::fs::OpenOptions::new()
            .append(true)
            .create(true)
            .open(path)
            .unwrap();
        writeln!(f, "{line}").unwrap();
    }
    assert!(took <= budget, "{what}: {took:?} is over its budget of {budget:?}");
}

fn screens() -> (Block, Block) {
    let mut rng = Rng::new(7);
    let old = screen(&mut rng, 200, 40);
    let new = mutate(&mut rng, &old, &mut 0, 40);
    (old, new)
}

#[test]
#[ignore = "release only: `just perf`"]
fn diffing_a_200_row_screen_stays_under_budget() {
    let (old, new) = screens();
    report(
        "diff a 200-row screen",
        time(400, || diff(&old, &new)),
        Duration::from_micros(150),
    );
}

#[test]
#[ignore = "release only: `just perf`"]
fn applying_the_ops_of_a_200_row_screen_stays_under_budget() {
    let (old, new) = screens();
    let ops = diff(&old, &new);
    let took = time(400, || {
        let mut s = old.clone();
        apply(&mut s, &ops).unwrap();
        s
    });
    report("apply the ops to a 200-row screen", took, Duration::from_micros(150));
}

#[test]
#[ignore = "release only: `just perf`"]
fn a_500_kb_screen_serializes_and_parses_under_budget() {
    let big = screen(&mut Rng::new(9), 5000, 90);
    let json = serde_json::to_string(&big).unwrap();
    assert!(json.len() >= 500_000, "the screen is only {} bytes", json.len());
    report(
        "serialize a 500 KB screen",
        time(10, || serde_json::to_string(&big).unwrap()),
        Duration::from_millis(3),
    );
    let took = time(10, || serde_json::from_str::<Block>(&json).unwrap());
    report("parse a 500 KB screen", took, Duration::from_millis(5));
}

#[test]
#[ignore = "release only: `just perf`"]
fn writing_a_500_kb_screen_as_a_site_fragment_stays_under_budget() {
    let big = blocks::Built::new(serde_json::to_value(screen(&mut Rng::new(9), 5000, 90)).unwrap());
    let took = time(10, || blocks::site::fragment(&big, "/act"));
    report("write a 500 KB screen as HTML", took, Duration::from_millis(10));
}

#[test]
#[ignore = "release only: `just perf`"]
fn checking_a_200_node_layout_stays_under_budget() {
    let contract = blocks::layout::Contract {
        components: &[],
        locked: &[],
    };
    let rows: Vec<String> = (0..199)
        .map(|i| format!(r#"{{"type": "screen", "source": "core", "path": "/screens/r{i}", "place": "push"}}"#))
        .collect();
    let text = format!(
        r#"{{"format": 1, "root": {{"type": "nav", "slots": {{"main": [{}]}}}}}}"#,
        rows.join(",")
    );
    let took = time(200, || blocks::layout::check(&text, &contract).unwrap());
    report("check a 200-node layout", took, Duration::from_micros(300));
}

#[test]
#[ignore = "release only: `just perf`"]
fn viewing_a_200_row_screen_with_a_show_on_every_block_stays_under_budget() {
    fn shows(v: &mut serde_json::Value) {
        if let Some(o) = v.as_object_mut() {
            o.insert("show".into(), serde_json::json!({"not": {"eq": [{"get": "q"}, "x"]}}));
        }
        for k in ["blocks", "rows"] {
            v.get_mut(k)
                .and_then(|l| l.as_array_mut())
                .into_iter()
                .flatten()
                .for_each(shows);
        }
    }
    let mut v = serde_json::to_value(screens().0).unwrap();
    shows(&mut v);
    let screen = Built::new(v);
    let state = start(&screen);
    report(
        "behave::view of a 200-row screen",
        time(400, || view(&screen, &state)),
        Duration::from_micros(1000),
    );
}
