use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use blocks::catalog::Catalog;
use blocks::model::{self, Case, Score};
use serde_json::{json, Value};

fn evals() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/evals")
}

fn each(dir: &str, ext: &str) -> Vec<(String, String)> {
    let mut out: Vec<(String, String)> = std::fs::read_dir(evals().join(dir))
        .unwrap()
        .map(|e| e.unwrap().path())
        .filter(|p| p.to_string_lossy().ends_with(ext))
        .map(|p| {
            let name = p
                .file_name()
                .unwrap()
                .to_string_lossy()
                .trim_end_matches(ext)
                .to_string();
            (name, std::fs::read_to_string(&p).unwrap())
        })
        .collect();
    out.sort();
    out
}

fn catalogs() -> BTreeMap<String, Catalog> {
    each("catalogs", ".json")
        .into_iter()
        .map(|(n, j)| (n, Catalog::read(&j).unwrap()))
        .collect()
}

fn cases() -> Vec<(String, Case)> {
    each("cases", ".json")
        .into_iter()
        .map(|(n, j)| (n, serde_json::from_str(&j).unwrap()))
        .collect()
}

#[test]
fn every_gold_reads_with_no_mend_and_full_marks() {
    let catalogs = catalogs();
    let all = cases();
    assert_eq!(all.len(), 12);
    assert_eq!(catalogs.len(), 2);
    for (name, case) in all {
        let gold = case.gold.to_string();
        let marks = model::score(&catalogs[&case.catalog], &case.expect, &gold, None);
        let full = Score {
            fit: true,
            meets: true,
            chars: gold.chars().count(),
            ..Score::default()
        };
        assert_eq!(marks, full, "{name}");
        let kept = std::fs::read_to_string(evals().join(format!("replies/gold/{name}.1.txt"))).unwrap();
        assert_eq!(
            serde_json::from_str::<Value>(&kept).unwrap(),
            case.gold,
            "{name}: the gold set"
        );
    }
}

#[test]
fn a_reply_meets_its_case_only_when_it_holds_every_kind_action_and_word_within_its_blocks() {
    let catalogs = catalogs();
    let (_, case) = cases().into_iter().find(|(n, _)| n == "pick-plan").unwrap();
    let ask = &catalogs["ask"];
    let button = |label: &str| json!({"type": "button", "label": label, "action": "pick"});
    let meets =
        |blocks: Vec<Value>| model::score(ask, &case.expect, &json!({"blocks": blocks}).to_string(), None).meets;
    assert!(meets(vec![button("pro"), button("TEAM")]));
    assert!(!meets(vec![button("Pro")]), "a word missing");
    assert!(
        !meets(vec![json!({"type": "prose", "markdown": "Pro or Team?"})]),
        "no button, no action"
    );
    assert!(
        !meets((0..7).map(|_| button("Pro or Team")).collect()),
        "over six blocks"
    );
}

#[test]
fn a_refused_first_reply_is_marked_by_its_retry_or_falls() {
    let catalogs = catalogs();
    let (_, case) = cases().into_iter().find(|(n, _)| n == "yes-no").unwrap();
    let ask = &catalogs["ask"];
    let gold = case.gold.to_string();
    let bad = gold.replace("\"answer\"", "\"answr\"");
    let retried = model::score(ask, &case.expect, &bad, Some(&gold));
    assert!(!retried.fit && retried.retry && !retried.fell && retried.meets);
    let fell = model::score(ask, &case.expect, &bad, Some("Deploy now?"));
    assert!(!fell.fit && !fell.retry && fell.fell && !fell.meets);
    assert!(model::score(ask, &case.expect, &bad, None).fell);
}

#[test]
fn every_action_and_link_in_an_eval_reply_that_fits_is_one_the_model_wrote() {
    let catalogs = catalogs();
    let cases: BTreeMap<String, Case> = cases().into_iter().collect();
    let mut fits = 0;
    for set in std::fs::read_dir(evals().join("replies")).unwrap() {
        let set = set.unwrap().path();
        if !set.is_dir() {
            continue;
        }
        for entry in std::fs::read_dir(&set).unwrap() {
            let path = entry.unwrap().path();
            let text = std::fs::read_to_string(&path).unwrap();
            let file = path.file_name().unwrap().to_string_lossy().to_string();
            let case = &cases[file.split('.').next().unwrap()];
            let Ok(fit) = model::read(&catalogs[&case.catalog], "eval", &text) else {
                continue;
            };
            let mut wrote = vec![];
            sent(&json!(fit.blocks), &mut wrote);
            for (k, v) in wrote {
                assert!(
                    text.contains(&format!("\"{v}\"")) || text.contains(&format!("]({v})")),
                    "{file}: {k} {v} is not in the reply"
                );
            }
            fits += 1;
        }
    }
    assert!(fits >= 18, "{fits} fits");
}

fn sent(v: &Value, out: &mut Vec<(String, String)>) {
    match v {
        Value::Object(o) => o.iter().for_each(|(k, x)| {
            if let ("action" | "url" | "href" | "link" | "src", Some(s)) = (k.as_str(), x.as_str()) {
                out.push((k.clone(), s.into()));
            }
            sent(x, out);
        }),
        Value::Array(l) => l.iter().for_each(|x| sent(x, out)),
        _ => {}
    }
}
