use std::io::Write;

use blocks::tree::Step;
use blocks::Block;
use blocks_desk::Desk;
use serde_json::json;

const PASS_MS: f64 = 1000.0 / 60.0;
const PATCH_MS: f64 = 4.0;
const RUNS: usize = 5;

fn report(what: &str, took: f64, budget: f64) {
    let line = format!("| {what} | {took:.2} ms | {budget:.1} ms |");
    println!("{line}");
    if let Ok(path) = std::env::var("GITHUB_STEP_SUMMARY") {
        let mut f = std::fs::OpenOptions::new()
            .append(true)
            .create(true)
            .open(path)
            .unwrap();
        writeln!(f, "{line}").unwrap();
    }
}

#[test]
#[ignore = "release only: desktop.yml's perf step"]
fn the_200_row_screen_paints_every_pass_in_a_frame_and_each_patch_in_4_ms() {
    let row = |i: usize, title: &str| json!({"type": "row", "id": format!("r{i}"), "title": format!("{title} {i}"), "subtitle": "build green", "value": "2m"});
    let rows: Vec<_> = (0..200).map(|i| row(i, "Run")).collect();
    let screen: Block = serde_json::from_value(json!({"type": "screen", "id": "s", "title": "Queue", "blocks": [
        {"type": "list", "id": "rows", "rows": rows}
    ]}))
    .unwrap();
    let frames: Vec<_> = (0..40usize)
        .map(|n| json!({"frame": {"k": "s", "rev": n + 2, "ops": [{"op": "replace", "id": format!("r{}", n * 5), "block": row(n * 5, "Patched")}]}}))
        .collect();
    let steps: Vec<Step> = serde_json::from_value(json!(frames)).unwrap();
    for (w, h) in [(1440, 900), (390, 844)] {
        let runs: Vec<_> = (0..RUNS)
            .map(|_| Desk::new(screen.clone()).size(w, h).run(&steps))
            .collect();
        let mut fastest = vec![f64::INFINITY; steps.len()];
        for run in &runs {
            assert!(run.faults.is_empty(), "{:?}", run.faults);
            let t = &run.report.timings;
            let longest = t.longest_frame_ms.unwrap();
            assert_eq!(t.frames_over_budget, Some(0), "{w}: {longest} ms is over {PASS_MS} ms");
            assert_eq!(t.steps_ms.len(), steps.len());
            for (f, s) in fastest.iter_mut().zip(&t.steps_ms) {
                *f = f.min(*s);
            }
        }
        let longest = runs
            .iter()
            .filter_map(|r| r.report.timings.longest_frame_ms)
            .fold(0.0, f64::max);
        let patch = fastest.iter().copied().fold(0.0, f64::max);
        report(
            &format!("desktop: longest pass of {RUNS} runs, 200 rows at {w}"),
            longest,
            PASS_MS,
        );
        report(
            &format!("desktop: slowest patch at its fastest of {RUNS} runs, 200 rows at {w}"),
            patch,
            PATCH_MS,
        );
        assert!(
            patch <= PATCH_MS,
            "{w}: a patch took {patch} ms in every run, over {PATCH_MS} ms"
        );
    }
}
