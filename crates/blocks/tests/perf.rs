mod support;

use std::io::Write;
use std::time::{Duration, Instant};

use blocks::{apply, diff, Screen};
use support::{mutate, screen, Rng};

fn time<T>(runs: u32, mut f: impl FnMut() -> T) -> Duration {
    let start = Instant::now();
    for _ in 0..runs {
        std::hint::black_box(f());
    }
    start.elapsed() / runs
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

fn screens() -> (Screen, Screen) {
    let mut rng = Rng::new(7);
    let old = screen(&mut rng, 200, 40);
    let new = mutate(&mut rng, &old, &mut 0, 40);
    (old, new)
}

#[test]
fn diffing_a_200_row_screen_stays_under_budget() {
    let (old, new) = screens();
    report(
        "diff a 200-row screen",
        time(2000, || diff(&old, &new)),
        Duration::from_micros(150),
    );
}

#[test]
fn applying_the_ops_of_a_200_row_screen_stays_under_budget() {
    let (old, new) = screens();
    let ops = diff(&old, &new);
    let took = time(2000, || {
        let mut s = old.clone();
        apply(&mut s, &ops).unwrap();
        s
    });
    report("apply the ops to a 200-row screen", took, Duration::from_micros(150));
}

#[test]
fn a_500_kb_screen_serializes_and_parses_under_budget() {
    let big = screen(&mut Rng::new(9), 5000, 90);
    let json = serde_json::to_string(&big).unwrap();
    assert!(json.len() >= 500_000, "the screen is only {} bytes", json.len());
    report(
        "serialize a 500 KB screen",
        time(50, || serde_json::to_string(&big).unwrap()),
        Duration::from_millis(3),
    );
    let took = time(50, || serde_json::from_str::<Screen>(&json).unwrap());
    report("parse a 500 KB screen", took, Duration::from_millis(5));
}
