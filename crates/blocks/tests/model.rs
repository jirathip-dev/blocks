use std::path::{Path, PathBuf};

use blocks::catalog::Catalog;
use blocks::model::{self, Fit, Refusal};
use blocks::Action;
use serde_json::{json, Value};

fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/model")
}

fn catalog() -> Catalog {
    Catalog::read(&std::fs::read_to_string(root().join("catalog.json")).unwrap()).unwrap()
}

fn cases() -> Vec<(String, Value)> {
    let mut out: Vec<(String, Value)> = std::fs::read_dir(root().join("read"))
        .unwrap()
        .map(|e| e.unwrap().path())
        .map(|p| {
            let name = p.file_stem().unwrap().to_string_lossy().to_string();
            (
                name,
                serde_json::from_str(&std::fs::read_to_string(&p).unwrap()).unwrap(),
            )
        })
        .collect();
    out.sort_by(|a, b| a.0.cmp(&b.0));
    out
}

fn read(case: &Value) -> Result<Fit, Refusal> {
    let c = case
        .get("catalog")
        .map_or_else(catalog, |c| Catalog::read(&c.to_string()).unwrap());
    model::read(&c, "r", case["text"].as_str().unwrap())
}

fn sent(v: &Value, out: &mut Vec<(String, Value)>) {
    match v {
        Value::Object(o) => o.iter().for_each(|(k, x)| {
            let keep = [
                "action", "values", "confirm", "url", "href", "link", "src", "avatar", "poster", "type",
            ];
            if keep.contains(&k.as_str()) || (k == "style" && x == "destructive") {
                out.push((k.clone(), x.clone()));
            }
            sent(x, out);
        }),
        Value::Array(l) => l.iter().for_each(|x| sent(x, out)),
        _ => {}
    }
}

fn rules(no: &Refusal) -> Vec<&str> {
    no.errors.iter().map(|w| w.rule.as_str()).collect()
}

#[test]
fn every_case_reads_as_its_fixture_says() {
    let all = cases();
    assert!(all.len() >= 20, "{} cases", all.len());
    for (name, case) in all {
        match (read(&case), case.get("fit")) {
            (Ok(fit), Some(want)) => {
                assert_eq!(json!(fit.mends), want["mends"], "{name}: mends");
                assert_eq!(json!(fit.cut), want["cut"], "{name}: cut");
                if let Some(blocks) = want.get("blocks") {
                    assert_eq!(&json!(fit.blocks), blocks, "{name}: blocks");
                }
            }
            (Err(no), None) => {
                assert_eq!(json!(rules(&no)), case["refused"], "{name}: {}", no.say());
                let say = no.say();
                assert!(say.lines().count() <= 6, "{name}: {say}");
                assert!(say.lines().all(|l| l.chars().count() < 160), "{name}: {say}");
            }
            (Ok(fit), None) => panic!("{name}: read as {:?}, not refused", fit.mends),
            (Err(no), Some(_)) => panic!("{name}: refused: {}", no.say()),
        }
    }
}

#[test]
fn every_action_link_and_file_in_a_fit_is_exactly_what_the_model_wrote() {
    let mut fits = 0;
    for (name, case) in cases().into_iter().filter(|(_, c)| c.get("fit").is_some()) {
        let fit = read(&case).unwrap();
        let mut got = vec![];
        sent(&json!(fit.blocks), &mut got);
        let want: Vec<(String, Value)> = serde_json::from_value(case["fit"]["sends"].clone()).unwrap();
        assert_eq!(got, want, "{name}");
        fits += 1;
    }
    assert!(fits >= 9, "{fits} fits");
}

#[test]
fn nothing_that_sends_opens_or_loads_is_ever_mended() {
    let never = [
        ("an action", "never-action", "catalog/action"),
        ("a link", "never-link", "catalog/link"),
        ("a file address", "never-file", "catalog/media"),
        ("a confirm", "never-confirm", "catalog/field"),
        ("values", "never-values", "catalog/field"),
        ("a secret input", "never-secret-input", "catalog/input"),
        ("a secret block", "never-secret-block", "catalog/kind"),
        ("a kind's name", "never-kind", "catalog/kind"),
        ("a missing field", "never-missing", "lint/fault"),
        ("one bad block among good ones", "never-one-bad", "catalog/action"),
        (
            "a field that sends outside fields",
            "never-sends-outside",
            "catalog/field",
        ),
    ];
    let all = cases();
    for (what, file, rule) in never {
        let (_, case) = all.iter().find(|(n, _)| n == file).unwrap();
        match read(case) {
            Ok(fit) => panic!("{what} was mended: {:?}", fit.mends),
            Err(no) => assert!(rules(&no).contains(&rule), "{what}: {}", no.say()),
        }
    }
    let one_bad = &all.iter().find(|(n, _)| n == "never-one-bad").unwrap().1;
    let say = read(one_bad).unwrap_err().say();
    assert_eq!(
        say,
        "Not drawn: 1 problem. Send the whole JSON again with these fixed.\n1. blocks[2] (button): `wipe`; this kind may send: pick, open-plan. Send only an action the finding lists for this kind, spelt as written, or none."
    );
}

#[test]
fn a_link_or_a_file_address_fits_only_under_a_listed_start() {
    let cases: Value = serde_json::from_str(&std::fs::read_to_string(root().join("links.json")).unwrap()).unwrap();
    let c = catalog();
    for (kind, list) in [("link", &cases["links"]), ("media", &cases["media"])] {
        for case in list.as_array().unwrap() {
            let (at, ok) = (case[0].as_str().unwrap(), case[1].as_bool().unwrap());
            let block = match kind {
                "link" => json!({"type": "row", "title": "Docs", "tap": {"url": at}}),
                _ => json!({"type": "media", "src": at, "alt": "A plan", "width": 4, "height": 3}),
            };
            let got = model::read(&c, "r", &json!({"blocks": [block]}).to_string());
            let rule = if kind == "link" {
                "catalog/link"
            } else {
                "catalog/media"
            };
            match got {
                Ok(_) => assert!(ok, "{at} fit"),
                Err(no) => assert!(!ok && rules(&no).contains(&rule), "{at}: {}", no.say()),
            }
        }
    }
}

#[test]
fn a_reply_read_while_written_keeps_each_closed_block_and_its_id() {
    let whole = r#"{"blocks": [{"type": "prose", "markdown": "Pick a plan, {or not}."}, {"type": "card", "title": "Plans", "buttons": [{"type": "button", "label": "Pro", "action": "pick"}]}, {"type": "button", "label": "Team", "action": "pick"}]}"#;
    let c = catalog();
    let full = model::read(&c, "r", whole).unwrap();
    assert!(!full.cut && full.mends.is_empty());
    let mut most = 0;
    for (end, _) in whole.char_indices().skip(1) {
        let fit = model::read(&c, "r", &whole[..end]).unwrap();
        assert!(fit.cut, "{end}");
        assert!(fit.blocks.len() >= most, "{end}: a block went away");
        most = fit.blocks.len();
        assert_eq!(fit.blocks[..], full.blocks[..most], "{end}");
    }
    assert_eq!(most, 3);
}

#[test]
fn own_takes_the_prefix_off_an_action_from_its_own_reply_only() {
    let action = |block: &str| Action {
        screen: "chat".into(),
        block: Some(block.into()),
        action: "submit".into(),
        values: serde_json::from_value(json!({"r.email": "a@b.example", "plan": "pro"})).unwrap(),
    };
    let values = model::own("r", &action("r.4")).unwrap();
    assert_eq!(json!(values), json!({"email": "a@b.example", "plan": "pro"}));
    for other in ["s.4", "r", "r.", "r.x.4", "rr.4"] {
        assert_eq!(model::own("r", &action(other)), None, "{other}");
    }
}

#[test]
fn a_refusal_says_at_most_six_lines_and_its_plain_text_holds_no_action_or_link() {
    let bad: Vec<Value> = (0..7)
        .map(|i| json!({"type": "button", "label": format!("B{i}"), "action": "wipe"}))
        .collect();
    let no = model::read(&catalog(), "r", &json!({"blocks": bad}).to_string()).unwrap_err();
    let say = no.say();
    assert!(say.starts_with("Not drawn: 8 problems."), "{say}");
    assert_eq!(say.lines().count(), 6);
    let plain = json!(no.plain("r"));
    assert_eq!(plain["type"], "prose");
    assert_eq!(plain["id"], "r.0");
    assert!(plain.to_string().contains("B6"));
    let text = "Pro is $10: see [the plans](https://plans.example/).";
    let no = model::read(&catalog(), "r", text).unwrap_err();
    let plain = json!(no.plain("r"));
    let mut sends = vec![];
    sent(&plain, &mut sends);
    assert_eq!(sends, [("type".to_string(), json!("prose"))]);
    assert!(plain.to_string().contains("the plans"));
}
