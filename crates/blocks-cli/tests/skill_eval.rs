use std::path::{Path, PathBuf};
use std::process::Command;

fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../..")
}

fn tmp(name: &str) -> PathBuf {
    let dir = Path::new(env!("CARGO_TARGET_TMPDIR")).join(name);
    if dir.exists() {
        std::fs::remove_dir_all(&dir).unwrap();
    }
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

fn eval(evals: &Path, replies: &Path) -> (i32, String, String) {
    let out = Command::new(env!("CARGO_BIN_EXE_blocks"))
        .args(["eval", "--skill"])
        .arg(evals)
        .arg("--replies")
        .arg(replies)
        .output()
        .unwrap();
    (
        out.status.code().unwrap(),
        String::from_utf8(out.stdout).unwrap(),
        String::from_utf8(out.stderr).unwrap(),
    )
}

fn recorded() -> PathBuf {
    root().join("fixtures/skill/evals/replies")
}

fn skill_evals() -> PathBuf {
    root().join("skill/blocks/evals")
}

#[test]
fn the_recorded_replies_meet_every_case_of_the_skills_evals() {
    let cases: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(skill_evals().join("evals.json")).unwrap()).unwrap();
    let n = cases["cases"].as_array().unwrap().len();
    assert!(n >= 8, "{n} cases");
    let (code, out, err) = eval(&skill_evals(), &recorded());
    assert_eq!(code, 0, "{out}{err}");
    assert_eq!(out.lines().filter(|l| l.starts_with("ok ")).count(), n, "{out}");
    assert!(out.ends_with(&format!("{n} cases, 0 failed\n")), "{out}");
}

#[test]
fn a_reply_that_misses_an_expectation_fails_the_run_with_each_miss_named() {
    let replies = tmp("skill-eval-misses");
    for e in std::fs::read_dir(recorded()).unwrap() {
        let p = e.unwrap().path();
        std::fs::copy(&p, replies.join(p.file_name().unwrap())).unwrap();
    }
    let mut deploy: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(replies.join("deploy-card.json")).unwrap()).unwrap();
    deploy["blocks"][0]["buttons"][1]["style"] = "primary".into();
    deploy["blocks"][0]["buttons"][1]["action"] = "restage".into();
    std::fs::write(replies.join("deploy-card.json"), deploy.to_string()).unwrap();
    std::fs::write(
        replies.join("settings-secret.json"),
        r#"{"type": "screen", "id": "s", "blocks": [{"type": "table", "id": "t", "columns": [], "rows": []}, {"type": "text", "id": "n", "markdown": "None yet."}]}"#,
    )
    .unwrap();
    std::fs::remove_file(replies.join("sign-up.json")).unwrap();
    let (code, out, err) = eval(&skill_evals(), &replies);
    assert_eq!(code, 1, "{out}{err}");
    assert!(
        out.contains("FAIL deploy-card: lint/primary-twice at screen#deploy/card#release; no action `stage`\n"),
        "{out}"
    );
    assert!(
        out.contains(
            "FAIL settings-secret: lint/untitled at screen#s; no `secret`; no `button`; a `table`; no action `save`\n"
        ),
        "{out}"
    );
    assert!(out.contains("FAIL sign-up: "), "{out}");
    assert!(out.contains("ok weekly-sales\n"), "{out}");
    assert!(out.ends_with("cases, 3 failed\n"), "{out}");
}

#[test]
fn the_checker_refuses_a_case_outside_the_schema() {
    let dir = tmp("skill-eval-schema");
    let bad = [
        (
            r#"{"cases": [{"id": "a", "prompt": "A screen.", "colour": "red"}]}"#,
            "unknown field `colour`",
        ),
        (
            r#"{"cases": [{"id": "a", "prompt": "A screen.", "kinds": ["gizmo"]}]}"#,
            "case `a`: `gizmo` is no kind",
        ),
        (
            r#"{"cases": [{"id": "a", "prompt": "A screen.", "avoid": ["lint/nope"]}]}"#,
            "case `a`: `lint/nope` is no rule",
        ),
        (r#"{"cases": [{"id": "a", "prompt": " "}]}"#, "case `a`: no prompt"),
        (
            r#"{"cases": [{"id": "a", "prompt": "A."}, {"id": "a", "prompt": "B."}]}"#,
            "case `a`: an empty or repeated id",
        ),
    ];
    for (json, want) in bad {
        std::fs::write(dir.join("evals.json"), json).unwrap();
        let (code, out, err) = eval(&dir, &recorded());
        assert_eq!(code, 2, "{json}: {out}{err}");
        assert!(err.contains(want), "{json}: {err}");
        assert_eq!(out, "", "{json}");
    }
}
