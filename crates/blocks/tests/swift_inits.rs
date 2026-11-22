use std::path::{Path, PathBuf};

use blocks::{Block, Built};
use serde_json::Value;

fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../..")
}

#[test]
fn every_generated_public_struct_has_a_public_init() {
    let dir = root().join("swift/Sources/Blocks/Gen");
    let mut missing = vec![];
    let mut seen = 0;
    for e in std::fs::read_dir(&dir).unwrap() {
        let path = e.unwrap().path();
        let text = std::fs::read_to_string(&path).unwrap();
        for body in text.split("\npublic struct ").skip(1) {
            let body = body.split("\n}\n").next().unwrap();
            seen += 1;
            if !body.contains("\n    public init(") {
                missing.push(body.split(':').next().unwrap().to_string());
            }
        }
    }
    assert!(seen > 100, "only {seen} public structs in {}", dir.display());
    assert!(missing.is_empty(), "no public init: {missing:?}");
}

#[test]
fn the_typed_screen_fixture_is_a_clean_screen() {
    let text = std::fs::read_to_string(root().join("fixtures/typed/screen.json")).unwrap();
    let want: Value = serde_json::from_str(&text).unwrap();
    let block: Block = serde_json::from_value(want.clone()).unwrap();
    assert!(matches!(block, Block::Screen(_)));
    assert_eq!(serde_json::to_value(&block).unwrap(), want);
    assert_eq!(Built::new(want).check(&[]), vec![]);
}
