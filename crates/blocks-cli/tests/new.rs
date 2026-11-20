use std::path::{Path, PathBuf};
use std::process::Command;

const DIRS: [&str; 5] = [
    "crates/blocks/src/kind/core",
    "crates/blocks/src/site/kind",
    "web/src/render/kind",
    "web/src/css/kind",
    "swift/Sources/BlocksUI/Kind",
];

fn repo(name: &str) -> PathBuf {
    let dir = Path::new(env!("CARGO_TARGET_TMPDIR")).join(name);
    if dir.exists() {
        std::fs::remove_dir_all(&dir).unwrap();
    }
    for d in DIRS.iter().chain(&["fixtures/stress"]) {
        std::fs::create_dir_all(dir.join(d)).unwrap();
    }
    let table = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/stress/table.json");
    std::fs::copy(table, dir.join("fixtures/stress/table.json")).unwrap();
    dir
}

fn new(cwd: &Path, name: &str) -> (i32, String, String) {
    let out = Command::new(env!("CARGO_BIN_EXE_blocks"))
        .args(["new", "kind", name])
        .current_dir(cwd)
        .output()
        .unwrap();
    let text = |b: &[u8]| String::from_utf8_lossy(b).into_owned();
    (out.status.code().unwrap(), text(&out.stdout), text(&out.stderr))
}

fn keys(dir: &Path) -> Vec<String> {
    let text = std::fs::read_to_string(dir.join("fixtures/stress/table.json")).unwrap();
    let table: serde_json::Map<String, serde_json::Value> = serde_json::from_str(&text).unwrap();
    table.keys().cloned().collect()
}

#[test]
fn new_kind_writes_the_five_files_named_for_the_kind_and_its_stress_row_in_order() {
    let dir = repo("new-gauge");
    let (code, out, err) = new(&dir, "gauge");
    assert_eq!((code, err.as_str()), (0, ""));
    let written: Vec<&str> = out.lines().collect();
    assert_eq!(
        written,
        [
            "crates/blocks/src/kind/core/gauge.rs",
            "crates/blocks/src/site/kind/gauge.rs",
            "web/src/render/kind/gauge.ts",
            "web/src/css/kind/gauge.css",
            "swift/Sources/BlocksUI/Kind/Gauge.swift",
            "fixtures/stress/table.json",
        ]
    );
    for f in &written {
        let text = std::fs::read_to_string(dir.join(f)).unwrap();
        assert!(!text.contains("{{"), "{f}: {text}");
    }
    let kind = std::fs::read_to_string(dir.join(written[0])).unwrap();
    let at = blocks::Block::KINDS.len();
    assert!(
        kind.contains(&format!("listed! {{ {at}: Gauge(Gauge) = \"gauge\" }}")),
        "{kind}"
    );
    let swift = std::fs::read_to_string(dir.join(written[4])).unwrap();
    assert!(
        swift.contains("struct GaugeBlock: View") && swift.contains("Blocks.Gauge"),
        "{swift}"
    );
    let mut want: Vec<String> = keys(&repo("new-was")).into_iter().chain(["gauge".into()]).collect();
    want.sort();
    let got = keys(&dir);
    assert_eq!(got, want);
    let text = std::fs::read_to_string(dir.join("fixtures/stress/table.json")).unwrap();
    let lines: Vec<&str> = text.lines().collect();
    let at = |k: &str| lines.iter().position(|l| l.starts_with(&format!("  \"{k}\": ")));
    assert_eq!(at("gauge"), at("form").map(|f| f + 1), "{text}");
}

#[test]
fn a_name_that_sorts_last_is_the_table_s_last_row() {
    let dir = repo("new-zoom");
    assert_eq!(new(&dir, "zoom").0, 0);
    assert_eq!(keys(&dir).last().map(String::as_str), Some("zoom"));
}

#[test]
fn new_kind_refuses_a_second_run_a_core_kind_and_a_bad_name_and_writes_nothing() {
    let dir = repo("new-twice");
    assert_eq!(new(&dir, "gauge").0, 0);
    let table = std::fs::read_to_string(dir.join("fixtures/stress/table.json")).unwrap();
    let (code, _, err) = new(&dir, "gauge");
    assert_eq!(code, 2);
    assert!(err.contains("gauge.rs: exists already"), "{err}");
    let (code, _, err) = new(&dir, "stat");
    assert_eq!(code, 2);
    assert!(err.contains("stat: a core kind already"), "{err}");
    for bad in ["Gauge", "gauge2", "my-kind", ""] {
        let (code, _, err) = new(&dir, bad);
        assert_eq!(code, 2, "{bad}");
        assert!(err.contains("lowercase letters a-z"), "{bad}: {err}");
    }
    assert_eq!(
        std::fs::read_to_string(dir.join("fixtures/stress/table.json")).unwrap(),
        table
    );
    let empty = repo("new-nowhere");
    std::fs::remove_dir_all(empty.join("web")).unwrap();
    let (code, _, err) = new(&empty, "gauge");
    assert_eq!(code, 2);
    assert!(err.contains("no such folder"), "{err}");
    assert!(!empty.join("crates/blocks/src/kind/core/gauge.rs").exists());
}
