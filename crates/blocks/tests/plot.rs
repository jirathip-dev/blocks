use std::path::{Path, PathBuf};

use blocks::wire::old;
use blocks::{apply, diff, ApplyError, AxisScale, Block, Built, Frame, Op, Peak, Plot, PlotAxis, Screen, Trace};
use serde_json::{json, Value};

fn dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/plot")
}

fn cases(prefix: &str) -> Vec<(String, Value)> {
    let mut out: Vec<(String, Value)> = std::fs::read_dir(dir())
        .unwrap()
        .map(|e| e.unwrap().path())
        .filter(|p| p.file_name().unwrap().to_str().unwrap().starts_with(prefix))
        .map(|p| {
            let v = serde_json::from_str(&std::fs::read_to_string(&p).unwrap()).unwrap();
            (p.file_name().unwrap().to_string_lossy().into_owned(), v)
        })
        .collect();
    out.sort_by(|a, b| a.0.cmp(&b.0));
    out
}

fn screen(blocks: Vec<Block>) -> Block {
    Block::Screen(Box::new(Screen::new().id("s").blocks(blocks)))
}

fn plot_in(s: &Block) -> &Plot {
    let Block::Screen(s) = s else { panic!("no screen") };
    let Some(Block::Plot(p)) = s.blocks.as_ref().and_then(|b| b.first()) else {
        panic!("no plot")
    };
    p
}

fn trace(name: &str, x: &[f64], y: &[f64]) -> Trace {
    let num = |v: &f64| serde_json::from_value(json!(v)).unwrap();
    Trace {
        name: name.into(),
        x: x.iter().map(num).collect(),
        y: y.iter().map(num).collect(),
        ..Trace::default()
    }
}

#[test]
fn points_runs_every_op_case() {
    let all = cases("op-");
    assert!(all.len() >= 7);
    for (name, case) in all {
        let plot: Block = serde_json::from_value(case["plot"].clone()).unwrap();
        let op: Op = serde_json::from_value(case["op"].clone()).unwrap();
        assert_eq!(
            serde_json::to_value(&op).unwrap(),
            case["op"],
            "{name}: the op round-trips"
        );
        let mut got = screen(vec![plot]);
        let res = apply(&mut got, &[op]);
        if case["want"].is_null() {
            assert!(matches!(res, Err(ApplyError::Shape(_))), "{name}: {res:?}");
            continue;
        }
        res.unwrap_or_else(|e| panic!("{name}: {e}"));
        let want: Vec<Trace> = serde_json::from_value(case["want"].clone()).unwrap();
        assert_eq!(plot_in(&got).series, want, "{name}");
    }
}

#[test]
fn drawn_gives_every_case_its_ranges_ticks_lines_and_readouts() {
    let all = cases("drawn-");
    assert!(all.len() >= 7);
    for (name, case) in all {
        let plot: Plot = serde_json::from_value(case["plot"].clone()).unwrap();
        assert_eq!(serde_json::to_value(plot.drawn()).unwrap(), case["drawn"], "{name}");
    }
}

#[derive(serde::Serialize, serde::Deserialize, PartialEq, Debug)]
struct Stream {
    start: Block,
    frames: Vec<Frame>,
    end: Block,
}

#[test]
fn a_thinned_line_keeps_each_columns_low_and_high_and_never_draws_over_2000_points() {
    let x: Vec<f64> = (0..20_000).map(f64::from).collect();
    let y: Vec<f64> = (0..20_000).map(|i| f64::from(i % 7) - 3.0).collect();
    let line = &Plot::new("Noise", vec![trace("A", &x, &y)]).drawn().lines[0];
    assert!(line.len() <= 2000, "{} points", line.len());
    assert!(line.len() > 1000, "{} points", line.len());
    assert!(line.iter().any(|&i| y[i] == 3.0) && line.iter().any(|&i| y[i] == -3.0));
}

fn live() -> Plot {
    Plot::new("Pull", vec![trace("Force", &[], &[])])
        .id("pull")
        .window(3)
        .x(PlotAxis {
            label: Some("Time".into()),
            scale: Some(AxisScale::Time),
            ..PlotAxis::default()
        })
        .y(PlotAxis {
            unit: Some("kg".into()),
            min: Some(0.into()),
            max: Some(60.into()),
            ..PlotAxis::default()
        })
}

fn stream() -> Stream {
    let mut plot = live();
    let start = screen(vec![Block::Plot(Box::new(plot.clone()))]);
    let (mut was, mut frames, mut best) = (start.clone(), vec![], 0.0_f64);
    let mut sample = 0_u32;
    for n in 1..=360_u32 {
        while sample * 3 <= n * 4 && sample < 480 {
            let t = f64::from(sample) / 80.0;
            let kg = ((30.0 + 12.0 * (t * 2.0).sin()) * 100.0).round() / 100.0;
            assert!(plot.push("Force", t, kg));
            if kg > best {
                best = kg;
                plot.peak = Some(Peak {
                    y: serde_json::from_value(json!(kg)).unwrap(),
                    label: format!("Peak {kg} kg"),
                });
            }
            sample += 1;
        }
        let now = screen(vec![Block::Plot(Box::new(plot.clone()))]);
        let ops = diff(&was, &now);
        let rev = u64::from(n);
        frames.push(Frame {
            k: "/live".into(),
            from: Some(rev - 1),
            rev,
            ops: Some(ops),
            screen: None,
        });
        was = now;
    }
    Stream {
        start,
        frames,
        end: was,
    }
}

fn written(s: &Stream) -> String {
    let frames: Vec<String> = s
        .frames
        .iter()
        .map(|f| format!("    {}", serde_json::to_string(f).unwrap()))
        .collect();
    format!(
        "{{\n  \"start\": {},\n  \"frames\": [\n{}\n  ],\n  \"end\": {}\n}}\n",
        serde_json::to_string(&s.start).unwrap(),
        frames.join(",\n"),
        serde_json::to_string(&s.end).unwrap()
    )
}

#[test]
fn generated_stream_is_what_push_and_diff_write() {
    let path = dir().join("stream.json");
    let want = written(&stream());
    if std::env::var_os("BLOCKS_GEN").is_some() {
        std::fs::write(&path, &want).unwrap();
    }
    assert!(
        std::fs::read_to_string(&path).unwrap() == want,
        "fixtures/plot/stream.json is behind: run `just gen`"
    );
}

#[test]
fn the_stream_applies_to_its_end_screen_with_one_points_op_a_frame_and_a_bounded_series() {
    let s: Stream = serde_json::from_str(&std::fs::read_to_string(dir().join("stream.json")).unwrap()).unwrap();
    assert_eq!(s.frames.len(), 360);
    let mut screen = s.start.clone();
    for f in &s.frames {
        let ops = f.ops.as_deref().unwrap();
        assert!(
            ops.iter().all(|o| matches!(o, Op::Points { .. } | Op::Merge { .. })),
            "{ops:?}"
        );
        assert!(ops.iter().filter(|o| matches!(o, Op::Points { .. })).count() <= 1);
        apply(&mut screen, ops).unwrap();
    }
    assert_eq!(screen, s.end);
    let xs: Vec<f64> = plot_in(&s.end).series[0]
        .x
        .iter()
        .filter_map(serde_json::Number::as_f64)
        .collect();
    assert_eq!(
        (xs.first(), xs.get(1), xs.last()),
        (Some(&2.975), Some(&2.9875), Some(&5.9875))
    );
}

#[test]
fn old_turns_a_frames_points_into_one_merge_of_the_series() {
    let s: Stream = serde_json::from_str(&std::fs::read_to_string(dir().join("stream.json")).unwrap()).unwrap();
    let mut before = s.start.clone();
    for f in s.frames.iter().take(300) {
        apply(&mut before, f.ops.as_deref().unwrap()).unwrap();
    }
    let mut after = before.clone();
    let ops: Vec<Op> = s.frames.iter().skip(300).flat_map(|f| f.ops.clone().unwrap()).collect();
    apply(&mut after, &ops).unwrap();
    let back = old(ops, &after);
    assert_eq!(
        back.iter()
            .filter(|o| matches!(o, Op::Merge { fields, .. } if fields.contains_key("series")))
            .count(),
        1
    );
    assert!(back.iter().all(|o| !matches!(o, Op::Points { .. })));
    apply(&mut before, &back).unwrap();
    assert_eq!(before, after);
}

#[test]
fn diff_writes_a_merge_of_series_when_a_series_is_renamed_or_a_point_edited() {
    let a = Plot::new("P", vec![trace("A", &[0.0, 1.0], &[1.0, 2.0])]).id("p");
    let renamed = Plot::new("P", vec![trace("B", &[0.0, 1.0], &[1.0, 2.0])]).id("p");
    let edited = Plot::new("P", vec![trace("A", &[0.0, 1.0], &[1.0, 3.0])]).id("p");
    let grown = Plot::new("P", vec![trace("A", &[1.0, 2.0], &[2.0, 4.0])]).id("p");
    let was = screen(vec![Block::Plot(Box::new(a))]);
    for (to, points) in [(renamed, false), (edited, false), (grown, true)] {
        let ops = diff(&was, &screen(vec![Block::Plot(Box::new(to))]));
        assert_eq!(
            ops.iter().any(|o| matches!(o, Op::Points { drop: Some(1), .. })),
            points,
            "{ops:?}"
        );
        assert_eq!(ops.iter().any(|o| matches!(o, Op::Merge { .. })), !points, "{ops:?}");
    }
}

#[test]
fn push_keeps_one_point_before_the_window_and_halves_a_whole_session_at_the_limit() {
    let mut w = Plot::new("P", vec![trace("A", &[], &[]), trace("B", &[], &[])]).window(2);
    assert!(!w.push("C", 0.0, 1.0) && !w.push("A", f64::NAN, 1.0));
    for i in 0..10 {
        assert!(w.push("A", f64::from(i), f64::from(i)));
    }
    assert!(!w.push("A", 1.0, 1.0), "x goes back");
    assert_eq!(serde_json::to_value(&w.series[0].x).unwrap(), json!([6, 7, 8, 9]));
    let mut s = Plot::new("P", vec![trace("A", &[], &[])]);
    let limit = u32::try_from(Trace::LIMIT).unwrap();
    for i in 0..limit {
        assert!(s.push("A", f64::from(i), f64::from((i * 7) % 13)));
    }
    let a = &s.series[0];
    assert_eq!(a.x.len(), Trace::LIMIT / 2);
    let ys: Vec<f64> = a.y.iter().filter_map(serde_json::Number::as_f64).collect();
    assert_eq!(ys.iter().copied().fold(f64::MIN, f64::max), 12.0);
    assert_eq!(a.x.first().and_then(serde_json::Number::as_f64), Some(0.0));
    assert!(a.x.last().and_then(serde_json::Number::as_f64).unwrap() >= f64::from(limit - 4));
    assert!(s.unfit().is_none());
}

#[test]
fn unfit_names_each_plot_that_cannot_be_sent() {
    let p = |series: Vec<Trace>| Plot::new("P", series);
    let a = || trace("A", &[0.0], &[1.0]);
    let long = Trace {
        x: vec![0.into(); Trace::LIMIT + 1],
        y: vec![0.into(); Trace::LIMIT + 1],
        ..a()
    };
    let target = p(vec![a()]).target(blocks::Target {
        min: 3.into(),
        max: 2.into(),
    });
    let axis = p(vec![a()]).y(PlotAxis {
        min: Some(5.into()),
        max: Some(1.into()),
        ..PlotAxis::default()
    });
    for (plot, says) in [
        (
            p(vec![
                a(),
                trace("B", &[], &[]),
                trace("C", &[], &[]),
                trace("D", &[], &[]),
                trace("E", &[], &[]),
                trace("F", &[], &[]),
            ]),
            "at most 5",
        ),
        (p(vec![a(), a()]), "two series named A"),
        (p(vec![trace("A", &[0.0, 1.0], &[1.0])]), "A has 2 x and 1 y"),
        (
            p(vec![trace("A", &[0.0, 2.0, 1.0], &[1.0, 1.0, 1.0])]),
            "x goes back at point 2",
        ),
        (p(vec![long]), "at most 20000"),
        (target, "the target's min is over its max"),
        (axis, "the y axis's min is over its max"),
    ] {
        let why = plot.unfit().unwrap_or_default();
        assert!(why.contains(says), "{why}");
        let faults = Built::of(&Screen::new().id("s").blocks(vec![Block::Plot(Box::new(plot))])).check(&[]);
        assert!(!faults.is_empty(), "{says}");
    }
    assert!(p(vec![a()]).unfit().is_none());
}

#[test]
fn an_older_client_reads_the_title_and_each_lines_latest_value() {
    let p = Plot::new(
        "Set 3",
        vec![
            trace("Force", &[0.0, 1.0], &[2.0, 30.9]),
            trace("Set 2", &[0.0], &[0.2]),
            trace("Idle", &[], &[]),
        ],
    )
    .y(PlotAxis {
        unit: Some("kg".into()),
        ..PlotAxis::default()
    });
    let built = Built::of(&Screen::new().id("s").blocks(vec![Block::Plot(Box::new(p))]));
    let fb = &built.value()["blocks"][0]["fallback"];
    assert_eq!(fb["title"], "Set 3");
    assert_eq!(fb["subtitle"], "Force 30.9 kg, Set 2 0.2 kg");
}
