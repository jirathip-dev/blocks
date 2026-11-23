use std::path::{Path, PathBuf};
use std::process::Command;

use blocks::catalog::Catalog;
use serde_json::Value;

fn evals() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/evals")
}

fn eval(args: &[&str]) -> (i32, String) {
    let out = Command::new(env!("CARGO_BIN_EXE_blocks"))
        .arg("eval")
        .arg(evals())
        .args(args)
        .output()
        .unwrap();
    (out.status.code().unwrap(), String::from_utf8(out.stdout).unwrap())
}

#[test]
fn every_recorded_set_scores_as_its_kept_table_says() {
    let mut sets = 0;
    for entry in std::fs::read_dir(evals().join("replies")).unwrap() {
        let dir = entry.unwrap().path();
        if !dir.is_dir() {
            continue;
        }
        let (code, out) = eval(&["--replies", dir.to_str().unwrap()]);
        assert_eq!(code, 0, "{}", dir.display());
        let kept = std::fs::read_to_string(dir.with_extension("txt")).unwrap();
        assert_eq!(
            out,
            kept,
            "{}: rerun blocks eval and keep its table if the change is meant",
            dir.display()
        );
        sets += 1;
    }
    assert!(sets >= 2, "{sets} sets");
}

#[test]
fn model_asks_the_command_records_both_replies_and_scores_them() {
    let dir = Path::new(env!("CARGO_TARGET_TMPDIR")).join("eval-model");
    drop(std::fs::remove_dir_all(&dir));
    std::fs::create_dir_all(&dir).unwrap();
    let log = dir.join("asked.jsonl");
    let cmd = format!(
        "in=$(cat); printf '%s\\n' \"$in\" >> '{}'; case \"$in\" in *assistant*) printf '%s' '{{\"blocks\": [{{\"type\": \"prose\", \"markdown\": \"Pick a plan.\"}}]}}';; *) printf 'Sure, here you go.';; esac",
        log.display()
    );
    let replies = dir.join("set");
    let (code, out) = eval(&["--replies", replies.to_str().unwrap(), "--model", &cmd]);
    assert_eq!(code, 0, "{out}");
    assert!(
        out.ends_with("12 cases: fit 0%, after one retry 100%, meets 0%, clean 0%, 0.0 mends, 59 characters a reply\n"),
        "{out}"
    );
    assert_eq!(
        std::fs::read_to_string(replies.join("cancel.1.txt")).unwrap(),
        "Sure, here you go."
    );
    assert!(std::fs::read_to_string(replies.join("yes-no.2.txt"))
        .unwrap()
        .contains("Pick a plan."));
    let asked: Vec<Value> = std::fs::read_to_string(&log)
        .unwrap()
        .lines()
        .map(|l| serde_json::from_str(l).unwrap())
        .collect();
    assert_eq!(asked.len(), 24);
    let ask = Catalog::read(&std::fs::read_to_string(evals().join("catalogs/ask.json")).unwrap()).unwrap();
    assert_eq!(asked[0]["system"], blocks::model::prompt(&ask));
    assert_eq!(
        asked[0]["messages"],
        serde_json::json!([{"role": "user", "text": "Cancel my subscription."}])
    );
    let again = asked[1]["messages"].as_array().unwrap();
    assert_eq!(again.len(), 3);
    assert_eq!(again[1]["text"], "Sure, here you go.");
    assert!(
        again[2]["text"].as_str().unwrap().starts_with("Not drawn: 1 problem."),
        "{again:?}"
    );

    let system = dir.join("terse.txt");
    std::fs::write(&system, "Answer in JSON.").unwrap();
    std::fs::remove_file(&log).unwrap();
    let (code, _) = eval(&[
        "--replies",
        replies.to_str().unwrap(),
        "--model",
        &cmd,
        "--system",
        system.to_str().unwrap(),
    ]);
    assert_eq!(code, 0);
    let first: Value = serde_json::from_str(std::fs::read_to_string(&log).unwrap().lines().next().unwrap()).unwrap();
    assert_eq!(first["system"], "Answer in JSON.");
}

#[test]
fn a_failing_model_command_stops_the_run() {
    let dir = Path::new(env!("CARGO_TARGET_TMPDIR")).join("eval-false");
    let (code, out) = eval(&["--replies", dir.to_str().unwrap(), "--model", "cat >/dev/null; exit 3"]);
    assert_eq!(code, 2, "{out}");
    assert!(out.is_empty(), "{out}");
}
