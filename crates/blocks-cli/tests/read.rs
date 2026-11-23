use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/model")
}

fn read(reply: &str) -> (i32, String) {
    let mut child = Command::new(env!("CARGO_BIN_EXE_blocks"))
        .arg("read")
        .arg(root().join("catalog.json"))
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .unwrap();
    child.stdin.take().unwrap().write_all(reply.as_bytes()).unwrap();
    let out = child.wait_with_output().unwrap();
    (out.status.code().unwrap(), String::from_utf8(out.stdout).unwrap())
}

#[test]
fn blocks_read_prints_the_checked_blocks_or_what_to_say_to_the_model() {
    let (code, out) =
        read("```json\n{\"blocks\": [{\"type\": \"button\", \"label\": \"Pro\", \"action\": \"pick\"}]}\n```");
    assert_eq!(code, 0, "{out}");
    let blocks: serde_json::Value = serde_json::from_str(&out).unwrap();
    assert_eq!(
        blocks,
        serde_json::json!([{"type": "button", "id": "reply.0", "label": "Pro", "action": "pick"}])
    );
    let (code, out) = read(r#"{"blocks": [{"type": "button", "label": "Wipe", "action": "wipe"}]}"#);
    assert_eq!(code, 1);
    assert!(out.starts_with("Not drawn: 1 problem."), "{out}");
    assert!(out.contains("blocks[0] (button): `wipe`"), "{out}");
}
