use std::path::{Path, PathBuf};

use blocks::theme::{
    check_pack, css, default, gate, packs, schemes, PerMode, Scheme, Style, Surface, Theme, DEFAULT_STYLE,
};

const TOKENS: [&str; 19] = [
    "--bg", "--card", "--edge", "--line", "--scrim", "--fg", "--mute", "--l", "--link", "--g", "--a", "--r", "--p",
    "--c", "--fk-l", "--fk-p", "--fk-c", "--fk-g", "--fk-a",
];

fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../..")
}

fn names(dir: &str) -> Vec<String> {
    let mut names: Vec<String> = std::fs::read_dir(root().join(dir))
        .unwrap()
        .map(|e| e.unwrap())
        .filter(|e| e.file_type().unwrap().is_dir() || e.path().extension().is_some_and(|x| x == "json"))
        .map(|e| e.file_name().to_string_lossy().replace(".json", ""))
        .collect();
    names.sort();
    names
}

fn read<T: serde::de::DeserializeOwned>(path: &str) -> T {
    serde_json::from_str(&std::fs::read_to_string(root().join(path)).unwrap()).unwrap()
}

#[test]
fn every_scheme_file_is_built_in_and_defines_every_required_token() {
    let built: Vec<&str> = schemes().iter().map(|(n, _)| *n).collect();
    let files = names("theme/schemes");
    assert_eq!(built, files);
    assert_eq!(built.len(), 12);
    for name in files {
        let v: serde_json::Value = read(&format!("theme/schemes/{name}.json"));
        let keys: Vec<&str> = v["tokens"].as_object().unwrap().keys().map(String::as_str).collect();
        assert_eq!(keys.len(), TOKENS.len(), "{name}: {keys:?}");
        for t in TOKENS {
            assert!(keys.contains(&t), "{name} lacks {t}");
        }
    }
    for (name, s) in schemes() {
        let keys: Vec<&str> = s.tokens.all().iter().map(|(k, _)| *k).collect();
        assert_eq!(keys, TOKENS, "{name}");
    }
}

#[test]
fn a_scheme_missing_a_token_or_with_a_bad_colour_does_not_parse() {
    let text = std::fs::read_to_string(root().join("fixtures/schemes/missing-token.json")).unwrap();
    let err = serde_json::from_str::<Scheme>(&text).unwrap_err().to_string();
    assert!(err.contains("--fk-a"), "{err}");
    let light = serde_json::to_string(&default().light).unwrap();
    for bad in ["#f6f6f", "f6f6f6", "#f6f6fz", "#f6f6f6a"] {
        let text = light.replace("#f6f6f6", bad);
        let err = serde_json::from_str::<Scheme>(&text).unwrap_err().to_string();
        assert!(err.contains("not #rrggbb"), "{bad}: {err}");
    }
}

#[test]
fn every_built_in_scheme_and_the_default_pair_pass_the_gate_and_canonical_solarized_fails_it() {
    for (name, s) in schemes() {
        assert_eq!(gate(s), [], "{name}");
    }
    assert_eq!(gate(&default().light), []);
    assert_eq!(gate(&default().dark), []);
    let text = std::fs::read_to_string(root().join("fixtures/schemes/solarized-canonical.json")).unwrap();
    let misses = gate(&serde_json::from_str(&text).unwrap());
    assert!(
        misses.iter().any(|m| m.what == "--mute on --bg" && m.got < m.min),
        "{misses:?}"
    );
}

#[test]
fn the_default_pair_and_style_are_the_approved_design_and_take_no_named_colour() {
    let pair = default();
    let design = "docs/design/neutral-default";
    assert_eq!(pair.light, read::<Scheme>(&format!("{design}/default-light.json")));
    assert_eq!(pair.dark, read::<Scheme>(&format!("{design}/default-dark.json")));
    let style: serde_json::Value = read(&format!("{design}/default-style.json"));
    let want: serde_json::Map<String, serde_json::Value> = DEFAULT_STYLE
        .iter()
        .map(|(k, v)| ((*k).to_owned(), (*v).into()))
        .collect();
    assert_eq!(style["style"].as_object().unwrap(), &want);
    let named: Vec<&str> = schemes()
        .iter()
        .flat_map(|(_, s)| s.tokens.all().map(|(_, v)| v.as_str()))
        .collect();
    for s in [&pair.light, &pair.dark] {
        for (k, v) in s.tokens.all() {
            assert!(
                !named.contains(&v.as_str()),
                "{} {k} {} is a named scheme's",
                s.label,
                v.as_str()
            );
        }
    }
}

#[test]
fn css_sets_every_token_for_both_modes() {
    let mut style = style("fixtures/styles/still.json").unwrap();
    let pair: &PerMode<Scheme> = default();
    let out = css(pair, &style);
    let (light, dark) = out.split_once("@media (prefers-color-scheme: dark)").unwrap();
    assert!(light.contains("--space:1.25;--motion:0;"), "{light}");
    style = style_of(r#""format": 1, "type": "mono", "radius": 0"#);
    assert!(css(pair, &style).contains("--space:1;--motion:1;"));
    for (k, v) in pair.light.tokens.all() {
        assert!(light.contains(&format!("{k}:{};", v.as_str())), "{k}");
    }
    for (k, v) in pair.dark.tokens.all() {
        assert!(dark.contains(&format!("{k}:{};", v.as_str())), "{k}");
    }
}

#[test]
fn the_vendored_packs_match_their_sums_and_name_built_in_schemes() {
    let dir = root().join("theme/packs");
    let ok = std::process::Command::new("shasum")
        .args(["-a", "256", "-c", "SHA256SUMS"])
        .current_dir(&dir)
        .status()
        .unwrap();
    assert!(ok.success());
    let names: Vec<&str> = packs().iter().map(|p| p.name).collect();
    assert_eq!(names, self::names("theme/packs"));
    let built = |name: &str| schemes().iter().any(|(n, _)| *n == name);
    for p in packs() {
        for (file, bytes) in p.files {
            assert_eq!(*bytes, std::fs::read(dir.join(p.name).join(file)).unwrap().as_slice());
        }
        let json = p.files.iter().find(|(f, _)| *f == "theme.json").unwrap().1;
        let t: Theme = serde_json::from_slice(json).unwrap();
        assert!(built(&t.scheme.dark), "{}", p.name);
        assert!(built(&t.scheme.light), "{}", p.name);
    }
}

fn style(path: &str) -> Result<Style, String> {
    serde_json::from_str(&std::fs::read_to_string(root().join(path)).unwrap()).map_err(|e| e.to_string())
}

fn style_of(head: &str) -> Style {
    let rest = r#""surface": "glass", "fills": "tint", "marks": "symbols", "sections": "title", "labels": {}"#;
    serde_json::from_str(&format!("{{{head}, {rest}}}")).unwrap()
}

#[test]
fn every_good_style_fixture_reads_and_format_1_gets_the_default_space_and_motion() {
    for name in ["modern", "still", "terminal"] {
        style(&format!("fixtures/styles/{name}.json")).unwrap();
    }
    let t = style("fixtures/styles/terminal.json").unwrap();
    assert_eq!((f64::from(t.space), f64::from(t.motion)), (1.0, 1.0));
    assert_eq!(t.surface, Surface::Dashed);
}

#[test]
fn each_bad_style_fixture_is_refused_with_its_reason() {
    let cases = [
        ("newer-format", "format 3: this reader takes 1 and 2"),
        ("unknown-key", "unknown field `shadow`"),
        ("unknown-surface", "unknown variant `neon`"),
        ("unknown-role", "unknown variant `footer`"),
        ("word-affix", "punctuation and spaces only, at most 4"),
        ("negative-space", "-1: a scale is from 0 to 4"),
        ("fast-motion", "10: a scale is from 0 to 4"),
        ("missing-radius", "missing field `radius`"),
    ];
    let mut files: Vec<String> = std::fs::read_dir(root().join("fixtures/styles/bad"))
        .unwrap()
        .map(|e| e.unwrap().file_name().to_string_lossy().replace(".json", ""))
        .collect();
    files.sort();
    let mut names: Vec<&str> = cases.iter().map(|(n, _)| *n).collect();
    names.sort_unstable();
    assert_eq!(files, names);
    for (name, why) in cases {
        let err = style(&format!("fixtures/styles/bad/{name}.json")).unwrap_err();
        assert!(err.contains(why) && err.contains("line"), "{name}: {err}");
    }
}

#[test]
fn every_vendored_pack_passes_check_pack() {
    for p in packs() {
        assert_eq!(check_pack(p.files), Vec::<String>::new(), "{}", p.name);
    }
}

#[test]
fn check_pack_refuses_a_broken_pack_with_each_reason() {
    let farm = packs()[0].files;
    let mut v: serde_json::Value = serde_json::from_slice(farm[0].1).unwrap();
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
    let misses = check_pack(&files);
    for why in [
        "lacks icon.png",
        "sprites.svg: not an SVG",
        "scene.svg: 307200 bytes, over 262144",
        "words: lacks \"idle\"",
        "words: \"napping\" is no word a renderer shows",
        "words.fail: \"\" is empty or over 24 characters",
        &not_dark,
        "scheme.light: \"solarized\" is no built-in scheme",
    ] {
        assert!(misses.iter().any(|m| m == why), "{why}: {misses:?}");
    }
    assert_eq!(misses.len(), 8, "{misses:?}");
    let icon: Vec<(&str, &[u8])> = farm
        .iter()
        .map(|(n, b)| if *n == "icon.png" { (*n, &b[..20]) } else { (*n, *b) })
        .collect();
    assert_eq!(check_pack(&icon), ["icon.png: not a 192×192 PNG"]);
    let broken: Vec<(&str, &[u8])> = vec![("theme.json", b"{")];
    assert!(check_pack(&broken).iter().any(|m| m.starts_with("theme.json: EOF")));
}
