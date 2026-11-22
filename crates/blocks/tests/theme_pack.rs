use std::path::{Path, PathBuf};

use blocks::theme::{check_pack, default, Scheme, Theme};

fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../..")
}

fn pack() -> Vec<(&'static str, Vec<u8>)> {
    ["theme.json", "sprites.svg", "scene.svg", "icon.png"]
        .map(|f| (f, std::fs::read(root().join("fixtures/packs/plain").join(f)).unwrap()))
        .to_vec()
}

fn given() -> [(&'static str, Scheme); 2] {
    [
        ("default-dark", default().dark.clone()),
        ("default-light", default().light.clone()),
    ]
}

fn borrowed<'a>(files: &'a [(&'static str, Vec<u8>)]) -> Vec<(&'static str, &'a [u8])> {
    files.iter().map(|(n, b)| (*n, b.as_slice())).collect()
}

#[test]
fn the_fixture_pack_passes_check_pack_on_the_schemes_given_and_only_those() {
    let files = pack();
    let files = borrowed(&files);
    assert_eq!(check_pack(&files, &given()), Vec::<String>::new());
    let t: Theme = serde_json::from_slice(files[0].1).unwrap();
    assert_eq!(
        (t.scheme.dark.as_str(), t.scheme.light.as_str()),
        ("default-dark", "default-light")
    );
    assert_eq!(
        check_pack(&files, &[]),
        [
            "scheme.dark: \"default-dark\" is none of the schemes given",
            "scheme.light: \"default-light\" is none of the schemes given",
        ]
    );
}

#[test]
fn check_pack_refuses_a_broken_pack_with_each_reason() {
    let plain = pack();
    let mut v: serde_json::Value = serde_json::from_slice(&plain[0].1).unwrap();
    let light = v["scheme"]["light"].clone();
    v["scheme"]["dark"] = light.clone();
    v["scheme"]["light"] = "solarized".into();
    let words = v["words"].as_object_mut().unwrap();
    let idle = words.remove("idle").unwrap();
    words.insert("napping".into(), idle);
    words.insert("fail".into(), "".into());
    let theme = v.to_string();
    let not_dark = format!("scheme.dark: {light} is not a dark scheme");
    let big = vec![b'<'; 300 * 1024];
    let files: Vec<(&str, &[u8])> = vec![
        ("theme.json", theme.as_bytes()),
        ("sprites.svg", b"not svg"),
        ("scene.svg", &big),
    ];
    let misses = check_pack(&files, &given());
    for why in [
        "lacks icon.png",
        "sprites.svg: not an SVG",
        "scene.svg: 307200 bytes, over 262144",
        "words: lacks \"idle\"",
        "words: \"napping\" is no word a renderer shows",
        "words.fail: \"\" is empty or over 24 characters",
        &not_dark,
        "scheme.light: \"solarized\" is none of the schemes given",
    ] {
        assert!(misses.iter().any(|m| m == why), "{why}: {misses:?}");
    }
    assert_eq!(misses.len(), 8, "{misses:?}");
    let icon: Vec<(&str, &[u8])> = borrowed(&plain)
        .into_iter()
        .map(|(n, b)| if n == "icon.png" { (n, &b[..20]) } else { (n, b) })
        .collect();
    assert_eq!(check_pack(&icon, &given()), ["icon.png: not a 192×192 PNG"]);
    let broken: Vec<(&str, &[u8])> = vec![("theme.json", b"{")];
    assert!(check_pack(&broken, &given())
        .iter()
        .any(|m| m.starts_with("theme.json: EOF")));
}
