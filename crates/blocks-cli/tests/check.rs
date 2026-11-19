use std::path::{Path, PathBuf};
use std::process::Command;

use serde_json::Value;

const OK: &str = include_str!("../../../fixtures/guard/ok/ok-queue.json");
const BAD: &str = include_str!("../../../fixtures/guard/bad/lint/title-long.json");
const CONFIG: &str = r#"{ "screens": ["screens"] }"#;

struct Repo(PathBuf);

impl Repo {
    fn new(name: &str) -> Repo {
        let dir = Path::new(env!("CARGO_TARGET_TMPDIR")).join(name);
        if dir.exists() {
            std::fs::remove_dir_all(&dir).unwrap();
        }
        std::fs::create_dir_all(&dir).unwrap();
        let repo = Repo(dir);
        repo.git(&["init", "-q", "-b", "main"]);
        repo.git(&["config", "user.email", "t@example.com"]);
        repo.git(&["config", "user.name", "t"]);
        repo
    }

    fn git(&self, args: &[&str]) {
        let st = Command::new("git").args(args).current_dir(&self.0).status().unwrap();
        assert!(st.success(), "git {args:?}");
    }

    fn write(&self, path: &str, text: &str) {
        let p = self.0.join(path);
        std::fs::create_dir_all(p.parent().unwrap()).unwrap();
        std::fs::write(p, text).unwrap();
    }

    fn commit(&self, msg: &str) {
        self.git(&["add", "-A"]);
        self.git(&["commit", "-q", "-m", msg]);
    }

    fn branch(&self) {
        self.git(&["checkout", "-q", "-b", "pr"]);
    }

    fn check(&self, args: &[&str]) -> (i32, Value) {
        let out = Command::new(env!("CARGO_BIN_EXE_blocks"))
            .arg("check")
            .args(args)
            .args(["--format", "json"])
            .current_dir(&self.0)
            .output()
            .unwrap();
        let code = out.status.code().unwrap();
        let json = serde_json::from_slice(&out.stdout).unwrap_or(Value::Null);
        (code, json)
    }

    fn base(&self) -> (i32, Value) {
        self.check(&["--base", "main"])
    }
}

fn new_rules(o: &Value) -> Vec<String> {
    o["new"]
        .as_array()
        .unwrap()
        .iter()
        .map(|f| format!("{} {}", f["rule"].as_str().unwrap(), f["file"].as_str().unwrap()))
        .collect()
}

fn adopted(name: &str) -> Repo {
    let r = Repo::new(name);
    r.write(".blocks/guard.json", CONFIG);
    r.write("screens/a.json", OK);
    r.write("screens/b.json", BAD);
    r.write("screens/list.json", "[]");
    r.commit("base");
    r
}

#[test]
fn a_new_error_fails_in_a_changed_fixture_and_not_in_an_unchanged_one() {
    let r = adopted("changed");
    r.branch();
    r.write("notes.md", "x");
    let (code, o) = r.base();
    assert_eq!((code, o["checked"].as_array().unwrap().len()), (0, 0), "{o}");
    r.write("screens/a.json", BAD);
    r.commit("a turns bad");
    let (code, o) = r.base();
    assert_eq!(code, 1, "{o}");
    assert_eq!(new_rules(&o), ["lint/title-long screens/a.json"]);
    assert_eq!(o["checked"], serde_json::json!(["screens/a.json"]));
    assert_eq!(o["skipped"], serde_json::json!(["screens/list.json: not a screen"]));
}

#[test]
fn a_grown_baseline_fails_and_an_adopting_one_does_not() {
    let r = Repo::new("grew");
    r.write("screens/b.json", BAD);
    r.commit("before the guard");
    r.branch();
    r.write(".blocks/guard.json", CONFIG);
    assert_eq!(r.check(&["--tighten"]).0, 0);
    assert!(r.0.join(".blocks/baseline/b.json").exists());
    r.commit("adopt");
    assert_eq!(r.base().0, 0, "a base with no guard.json is adopting");
    r.git(&["checkout", "-q", "main"]);
    r.git(&["merge", "-q", "pr"]);
    r.git(&["checkout", "-q", "-b", "pr2"]);
    r.write("screens/c.json", BAD);
    assert_eq!(r.check(&["--tighten"]).0, 0);
    r.commit("c is new, and baselined");
    let (code, o) = r.base();
    assert_eq!(code, 1, "{o}");
    assert_eq!(new_rules(&o), ["guard/baseline-grew screens/c.json"]);
}

#[test]
fn a_stale_baseline_entry_fails_until_tighten_drops_it() {
    let r = adopted("stale");
    assert_eq!(r.check(&["--tighten"]).0, 0);
    r.commit("baseline");
    r.branch();
    r.write("screens/b.json", OK);
    let (code, o) = r.base();
    assert_eq!(code, 1, "{o}");
    assert_eq!(new_rules(&o), ["guard/baseline-stale screens/b.json"]);
    assert_eq!(r.check(&["--tighten"]).0, 0);
    assert!(!r.0.join(".blocks/baseline/b.json").exists());
    assert_eq!(r.base().0, 0);
}

#[test]
fn an_unused_ignore_fails_and_a_used_one_passes() {
    let r = adopted("ignore");
    r.branch();
    let ignore =
        |rule: &str| format!(r#"[{{ "rule": "{rule}", "at": "screen#s", "reason": "a long title, on purpose" }}]"#);
    r.write(".blocks/ignore/a.json", &ignore("lint/title-long"));
    let (code, o) = r.base();
    assert_eq!(code, 1, "{o}");
    assert_eq!(new_rules(&o), ["guard/unused-ignore screens/a.json"]);
    r.write(".blocks/ignore/b.json", &ignore("lint/title-long"));
    std::fs::remove_file(r.0.join(".blocks/ignore/a.json")).unwrap();
    let (code, o) = r.base();
    assert_eq!(code, 0, "{o}");
    assert_eq!(o["ignored"][0]["reason"], "a long title, on purpose");
}

#[test]
fn an_ignore_with_no_reason_is_a_broken_setup() {
    let r = adopted("reason");
    r.write(
        ".blocks/ignore/b.json",
        r#"[{ "rule": "lint/title-long", "at": "screen#s", "reason": " " }]"#,
    );
    let out = Command::new(env!("CARGO_BIN_EXE_blocks"))
        .args(["check"])
        .current_dir(&r.0)
        .output()
        .unwrap();
    assert_eq!(out.status.code(), Some(2));
    assert!(String::from_utf8_lossy(&out.stderr).contains("an ignore needs a reason"));
    assert_eq!(r.check(&["--format", "yaml"]).0, 2);
    assert_eq!(r.check(&["--render"]).0, 2);
}

#[test]
fn the_text_report_names_the_rule_the_block_and_the_fix() {
    let r = adopted("text");
    let out = Command::new(env!("CARGO_BIN_EXE_blocks"))
        .args(["check"])
        .current_dir(&r.0)
        .output()
        .unwrap();
    assert_eq!(out.status.code(), Some(1));
    let text = String::from_utf8(out.stdout).unwrap();
    assert!(text.starts_with("screens/b.json\n  error  lint/title-long"), "{text}");
    assert!(text.contains("fix: Shorten it to 60 characters or fewer"), "{text}");
    assert!(
        text.ends_with("2 screens checked: 1 new errors, 0 known, 0 ignored, 0 warnings. FAIL\n"),
        "{text}"
    );
}

fn valid(schema: &Value, root: &Value, v: &Value, at: &str) -> Result<(), String> {
    let s = match schema.get("$ref").and_then(Value::as_str) {
        Some(r) => &root["definitions"][r.strip_prefix("#/definitions/").unwrap()],
        None => schema,
    };
    let fail = |why: &str| Err(format!("{at}: {why}"));
    if let Some(t) = s.get("type").and_then(Value::as_str) {
        let ok = match t {
            "object" => v.is_object(),
            "array" => v.is_array(),
            "string" => v.is_string(),
            "integer" => v.is_u64() || v.is_i64(),
            "number" => v.is_number(),
            "boolean" => v.is_boolean(),
            _ => false,
        };
        if !ok {
            return fail(&format!("not {t}"));
        }
    }
    if let Some(e) = s.get("enum").and_then(Value::as_array) {
        if !e.contains(v) {
            return fail(&format!("{v} not in {e:?}"));
        }
    }
    if let Some(min) = s.get("minimum").and_then(Value::as_i64) {
        if v.as_i64().unwrap() < min {
            return fail("under the minimum");
        }
    }
    if s.get("pattern").is_some() {
        return fail("a pattern this validator does not check");
    }
    if let Some(f) = s.get("format").and_then(Value::as_str) {
        if f == "uri" && !v.as_str().unwrap().starts_with("https://") {
            return fail("not a uri");
        }
    }
    if let Some(any) = s.get("anyOf").or(s.get("oneOf")).and_then(Value::as_array) {
        if !any.iter().any(|a| valid(a, root, v, at).is_ok()) {
            return fail("no anyOf branch");
        }
    }
    if let Some(a) = v.as_array() {
        if let Some(min) = s.get("minItems").and_then(Value::as_u64) {
            if (a.len() as u64) < min {
                return fail("too few items");
            }
        }
        if s.get("uniqueItems") == Some(&Value::Bool(true)) {
            for (i, x) in a.iter().enumerate() {
                if a[..i].contains(x) {
                    return fail("items not unique");
                }
            }
        }
        if let Some(items) = s.get("items") {
            for (i, x) in a.iter().enumerate() {
                valid(items, root, x, &format!("{at}/{i}"))?;
            }
        }
    }
    if let Some(o) = v.as_object() {
        for req in s.get("required").and_then(Value::as_array).into_iter().flatten() {
            if !o.contains_key(req.as_str().unwrap()) {
                return fail(&format!("no {req}"));
            }
        }
        let props = s.get("properties").and_then(Value::as_object);
        for (k, x) in o {
            match props.and_then(|p| p.get(k)) {
                Some(p) => valid(p, root, x, &format!("{at}/{k}"))?,
                None => match s.get("additionalProperties") {
                    Some(Value::Bool(false)) => return fail(&format!("{k} is not allowed")),
                    Some(extra @ Value::Object(_)) => valid(extra, root, x, &format!("{at}/{k}"))?,
                    _ => {}
                },
            }
        }
    }
    Ok(())
}

#[test]
fn the_sarif_validates_against_the_2_1_0_schema() {
    let r = adopted("sarif");
    assert_eq!(r.check(&["--tighten"]).0, 0);
    r.write("screens/c.json", BAD);
    r.write(
        ".blocks/ignore/c.json",
        r#"[{ "rule": "lint/title-long", "at": "screen#s", "reason": "on purpose" }]"#,
    );
    r.write("screens/d.json", BAD);
    let st = Command::new(env!("CARGO_BIN_EXE_blocks"))
        .args(["check", "--format", "sarif", "--out", "guard.sarif"])
        .current_dir(&r.0)
        .status()
        .unwrap();
    assert_eq!(st.code(), Some(1));
    let log: Value = serde_json::from_str(&std::fs::read_to_string(r.0.join("guard.sarif")).unwrap()).unwrap();
    let schema: Value = serde_json::from_str(include_str!("../../../fixtures/guard/sarif-2.1.0.schema.json")).unwrap();
    valid(&schema, &schema, &log, "").unwrap();
    let results = log["runs"][0]["results"].as_array().unwrap();
    let states: Vec<(&str, &str)> = results
        .iter()
        .map(|x| {
            let uri = x["locations"][0]["physicalLocation"]["artifactLocation"]["uri"]
                .as_str()
                .unwrap();
            (uri, x["baselineState"].as_str().unwrap_or("suppressed"))
        })
        .collect();
    assert_eq!(
        states,
        [
            ("screens/d.json", "new"),
            ("screens/b.json", "unchanged"),
            ("screens/c.json", "suppressed")
        ]
    );
    assert_eq!(results[2]["suppressions"][0]["justification"], "on purpose");
    assert!(results[0]["message"]["text"]
        .as_str()
        .unwrap()
        .contains(" Fix: Shorten it"));
    let mut bad = log.clone();
    bad["runs"][0]["results"][0]["level"] = "fatal".into();
    assert!(valid(&schema, &schema, &bad, "").is_err());
}

const HARNESS: &str =
    r#"cp "$2" plan.seen; cp seen.json "$(dirname "$2")/seen.json"; exit "$(cat code 2>/dev/null || echo 0)""#;

fn drawn(name: &str) -> Repo {
    let r = adopted(name);
    r.write(
        ".blocks/guard.json",
        r#"{ "screens": ["screens"], "css": ["app.css"], "harness": [["sh", "harness.sh"]] }"#,
    );
    r.write("harness.sh", HARNESS);
    r.write("app.css", ".b-card{transition:height 1s}\n");
    r.write("seen.json", "[]");
    r.write(".gitignore", "shots/\nplan.seen\n");
    r.commit("draw");
    r
}

fn plan(r: &Repo) -> Value {
    serde_json::from_str(&std::fs::read_to_string(r.0.join("plan.seen")).unwrap()).unwrap()
}

#[test]
fn render_hands_the_harness_one_plan_and_judges_what_it_saw() {
    let r = drawn("render");
    r.write("screens/b.json", OK);
    r.write(
        "seen.json",
        r#"[{ "rule": "render/tap-target", "at": "screen#s/button#go", "detail": "28 by 28 px", "run": "a", "shot": "a" },
            { "rule": "css/motion", "at": "", "detail": "transition: height", "file": "app.css", "line": 1 }]"#,
    );
    let (code, o) = r.check(&["--render"]);
    assert_eq!(code, 1, "{o}");
    assert_eq!(
        new_rules(&o),
        ["render/tap-target screens/a.json", "css/motion app.css"]
    );
    let p = plan(&r);
    assert_eq!(p["out"], "shots/render");
    let runs = p["runs"].as_array().unwrap();
    assert_eq!(runs.len(), 2);
    assert_eq!(
        runs[0],
        serde_json::json!({ "name": "a", "screen": "screens/a.json", "size": "390x844", "css": ["app.css"],
            "scripts": [], "kinds": [], "steps": [], "probes": true })
    );
    r.write(
        "seen.json",
        r#"[{ "rule": "render/nope", "at": "", "detail": "", "run": "a" }]"#,
    );
    assert_eq!(r.check(&["--render"]).0, 2, "a rule the table lacks is a broken setup");
    r.write(
        "seen.json",
        r#"[{ "rule": "render/tree", "at": "", "detail": "", "run": "zz" }]"#,
    );
    assert_eq!(r.check(&["--render"]).0, 2, "a run the plan lacks is a broken setup");
    r.write("seen.json", "[]");
    r.write("code", "1");
    assert_eq!(
        r.check(&["--render"]).0,
        2,
        "a harness that could not draw is a broken setup"
    );
}

#[test]
fn a_drawn_rules_baseline_entry_goes_stale_only_when_the_screens_are_drawn() {
    let r = drawn("drawn-stale");
    r.write("screens/b.json", OK);
    let tap = r#"[{ "rule": "render/tap-target", "at": "screen#s/button#go", "detail": "", "run": "a" }]"#;
    r.write("seen.json", tap);
    assert_eq!(r.check(&["--render", "--tighten"]).0, 0);
    let b: Value =
        serde_json::from_str(&std::fs::read_to_string(r.0.join(".blocks/baseline/a.json")).unwrap()).unwrap();
    assert_eq!(b["known"][0]["rule"], "render/tap-target");
    assert_eq!(r.check(&[]).0, 0, "a static run keeps the drawn entry");
    assert_eq!(r.check(&["--tighten"]).0, 0);
    assert!(
        r.0.join(".blocks/baseline/a.json").exists(),
        "a static tighten keeps it too"
    );
    r.write("seen.json", "[]");
    let (code, o) = r.check(&["--render"]);
    assert_eq!(code, 1, "{o}");
    assert_eq!(new_rules(&o), ["guard/baseline-stale screens/a.json"]);
}

#[test]
fn render_in_a_pr_draws_every_screen_when_the_apps_css_changed() {
    let r = drawn("redraw");
    r.write("screens/b.json", OK);
    r.commit("b fixed");
    r.branch();
    r.write("screens/a.json", OK.replace("Queue", "Lanes").as_str());
    r.commit("a");
    assert_eq!(
        r.check(&["--base", "main", "--render"]).1["checked"],
        serde_json::json!(["screens/a.json"])
    );
    r.write("app.css", ".b-card{transition:opacity 1s}\n");
    r.commit("css");
    let (_, o) = r.check(&["--base", "main", "--render"]);
    assert_eq!(o["checked"], serde_json::json!(["screens/a.json", "screens/b.json"]));
    assert_eq!(
        r.check(&["--base", "main"]).1["checked"],
        serde_json::json!(["screens/a.json"])
    );
}

#[test]
fn shot_draws_the_named_fixtures_at_390_and_1440_with_no_probe() {
    let r = drawn("shot");
    let out = Command::new(env!("CARGO_BIN_EXE_blocks"))
        .args(["check", "--shot", "b"])
        .current_dir(&r.0)
        .output()
        .unwrap();
    assert_eq!(out.status.code(), Some(0));
    assert_eq!(
        String::from_utf8_lossy(&out.stdout),
        "shots/390/b/b.png\nshots/1440/b/b.png\n"
    );
    let p = plan(&r);
    assert_eq!(p["out"], "shots");
    let runs: Vec<(&str, &str, bool)> = p["runs"]
        .as_array()
        .unwrap()
        .iter()
        .map(|x| {
            (
                x["name"].as_str().unwrap(),
                x["size"].as_str().unwrap(),
                x["probes"].as_bool().unwrap(),
            )
        })
        .collect();
    assert_eq!(runs, [("390/b", "390x844", false), ("1440/b", "1440x900", false)]);
    assert_eq!(r.check(&["--shot", "nope"]).0, 2);
}

#[test]
fn a_fixture_clean_on_base_may_record_a_rule_newer_than_base_and_no_other() {
    let r = adopted("clean");
    r.write(
        ".blocks/baseline/b.json",
        r#"{ "guard": 1, "known": [{ "rule": "lint/title-long", "at": "screen#s" }] }"#,
    );
    r.commit("baseline at guard 1");
    r.branch();
    let entry =
        |rule: &str| format!(r#"{{ "guard": 2, "known": [{{ "rule": "{rule}", "at": "screen#s/card#drive" }}] }}"#);
    r.write(".blocks/baseline/a.json", &entry("render/tap-target"));
    let (code, o) = r.base();
    assert_eq!(code, 0, "{o}");
    r.write(".blocks/baseline/a.json", &entry("lint/depth"));
    let (code, o) = r.base();
    assert_eq!(code, 1, "{o}");
    let grew = new_rules(&o);
    assert_eq!(
        grew,
        [
            "guard/baseline-stale screens/a.json",
            "guard/baseline-grew screens/a.json"
        ]
    );
}
