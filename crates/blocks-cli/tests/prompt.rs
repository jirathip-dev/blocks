use std::path::Path;
use std::process::Command;

fn blocks(args: &[&str]) -> (i32, String, String) {
    let out = Command::new(env!("CARGO_BIN_EXE_blocks"))
        .args(args)
        .current_dir(Path::new(env!("CARGO_MANIFEST_DIR")).join("../.."))
        .output()
        .unwrap();
    let text = |b: Vec<u8>| String::from_utf8(b).unwrap();
    (out.status.code().unwrap(), text(out.stdout), text(out.stderr))
}

#[test]
fn prompt_prints_the_catalogs_prompt_and_its_size() {
    let file = "fixtures/evals/catalogs/ask.json";
    let catalog = blocks::catalog::Catalog::read(&std::fs::read_to_string(Path::new("../..").join(file)).unwrap());
    let want = blocks::model::prompt(&catalog.unwrap());
    let (code, out, err) = blocks(&["prompt", file]);
    assert_eq!((code, out.as_str()), (0, want.as_str()), "{err}");
    assert_eq!(err, format!("{} characters\n", want.chars().count()));
}

#[test]
fn prompt_refuses_a_catalog_that_does_not_load() {
    let (code, out, err) = blocks(&["prompt", "Cargo.toml"]);
    assert_eq!((code, out.as_str()), (2, ""));
    assert!(err.starts_with("blocks: Cargo.toml: "), "{err}");
}
