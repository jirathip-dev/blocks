use std::collections::BTreeMap;
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

fn tree(dir: &Path) -> BTreeMap<String, String> {
    let mut out = BTreeMap::new();
    let mut todo = vec![dir.to_path_buf()];
    while let Some(d) = todo.pop() {
        for e in std::fs::read_dir(d).unwrap() {
            let p = e.unwrap().path();
            if p.is_dir() {
                todo.push(p);
            } else {
                let rel = p.strip_prefix(dir).unwrap().to_string_lossy().into_owned();
                out.insert(rel, std::fs::read_to_string(&p).unwrap());
            }
        }
    }
    out
}

fn skill(cwd: &Path, to: &Path) -> (i32, String) {
    let out = Command::new(env!("CARGO_BIN_EXE_blocks"))
        .args(["skill", "--to"])
        .arg(to)
        .current_dir(cwd)
        .output()
        .unwrap();
    (
        out.status.code().unwrap(),
        String::from_utf8_lossy(&out.stderr).into_owned(),
    )
}

#[test]
fn skill_to_on_this_repo_is_the_generated_skill_plus_its_examples() {
    let to = tmp("skill-here");
    assert_eq!(skill(&root(), &to), (0, String::new()));
    let mut got = tree(&to);
    let lanes = got.remove("examples/lanes.md").expect("the repo's example `lanes`");
    assert!(lanes.starts_with("# Example: `lanes`\n"), "{lanes}");
    let screen = std::fs::read_to_string(root().join("fixtures/screens/drover/lanes.json")).unwrap();
    let want: serde_json::Value = serde_json::from_str(&screen).unwrap();
    assert!(lanes.contains(&serde_json::to_string_pretty(&want).unwrap()));
    let generated = tree(&root().join("skill/blocks"));
    assert!(generated.contains_key("SKILL.md") && generated.contains_key("rules.md"));
    assert!(generated.contains_key("examples/ok-queue.md") && generated.contains_key("kinds/button.md"));
    assert_eq!(got, generated, "skill/blocks/ is not what `just gen` writes: rerun it");
}

#[test]
fn skill_to_refuses_an_example_with_a_finding_and_writes_nothing() {
    let app = tmp("skill-bad-app");
    let bad = std::fs::read_to_string(root().join("fixtures/guard/bad/lint/title-long.json")).unwrap();
    std::fs::create_dir_all(app.join(".blocks")).unwrap();
    std::fs::create_dir_all(app.join("screens")).unwrap();
    std::fs::write(app.join("screens/long.json"), bad).unwrap();
    let config = r#"{ "screens": ["screens"], "examples": ["long"] }"#;
    std::fs::write(app.join(".blocks/guard.json"), config).unwrap();
    let to = app.join("out");
    let (code, err) = skill(&app, &to);
    assert_eq!(code, 1, "{err}");
    assert!(
        err.contains("screens/long.json: an example with lint/title-long"),
        "{err}"
    );
    assert!(!to.exists());
    std::fs::write(
        app.join(".blocks/guard.json"),
        r#"{ "screens": ["screens"], "examples": ["gone"] }"#,
    )
    .unwrap();
    let (code, err) = skill(&app, &to);
    assert_eq!(code, 2, "{err}");
    assert!(err.contains("example `gone` is no fixture"), "{err}");
}

#[test]
fn each_kind_in_the_skill_index_has_its_own_description() {
    let to = tmp("skill-abouts");
    assert_eq!(skill(&root(), &to), (0, String::new()));
    let index = std::fs::read_to_string(to.join("SKILL.md")).unwrap();
    let mut seen: BTreeMap<&str, &str> = BTreeMap::new();
    for line in index.lines().filter(|l| l.starts_with("- [`")) {
        let (kind, about) = line.split_once("): ").unwrap();
        assert!(!about.is_empty(), "{kind} has no description");
        if let Some(other) = seen.insert(about, kind) {
            panic!("{other} and {kind} share the description {about:?}");
        }
    }
    assert!(seen.len() > 40, "{index}");
}
