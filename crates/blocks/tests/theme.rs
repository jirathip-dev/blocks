use std::path::{Path, PathBuf};

use blocks::theme::{css, gate, packs, schemes, PerMode, Scheme, Theme};

const EXPECTED: [&str; 12] = [
    "dracula",
    "farm",
    "farm-light",
    "garden-dark",
    "garden-light",
    "github-dark",
    "gruvbox",
    "kitchen",
    "kitchen-light",
    "nord",
    "paper",
    "solarized-dark",
];

const TOKENS: [&str; 19] = [
    "--bg", "--card", "--edge", "--line", "--scrim", "--fg", "--mute", "--l", "--link", "--g", "--a", "--r", "--p",
    "--c", "--fk-l", "--fk-p", "--fk-c", "--fk-g", "--fk-a",
];

fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../..")
}

fn scheme(name: &str) -> &'static Scheme {
    &schemes().iter().find(|(n, _)| *n == name).unwrap().1
}

#[test]
fn every_scheme_of_both_apps_is_built_in() {
    let names: Vec<&str> = schemes().iter().map(|(n, _)| *n).collect();
    assert_eq!(names, EXPECTED);
    let mut files: Vec<String> = std::fs::read_dir(root().join("theme/schemes"))
        .unwrap()
        .map(|e| e.unwrap().file_name().to_string_lossy().replace(".json", ""))
        .collect();
    files.sort();
    assert_eq!(files, EXPECTED);
}

#[test]
fn each_scheme_defines_every_required_token() {
    for name in EXPECTED {
        let text = std::fs::read_to_string(root().join(format!("theme/schemes/{name}.json"))).unwrap();
        let v: serde_json::Value = serde_json::from_str(&text).unwrap();
        let keys: Vec<&str> = v["tokens"].as_object().unwrap().keys().map(String::as_str).collect();
        assert_eq!(keys.len(), TOKENS.len(), "{name}: {keys:?}");
        for t in TOKENS {
            assert!(keys.contains(&t), "{name} lacks {t}");
        }
        let names: Vec<&str> = scheme(name).tokens.all().iter().map(|(k, _)| *k).collect();
        assert_eq!(names, TOKENS);
    }
}

#[test]
fn a_scheme_missing_a_token_or_with_a_bad_colour_does_not_parse() {
    let text = std::fs::read_to_string(root().join("fixtures/schemes/missing-token.json")).unwrap();
    let err = serde_json::from_str::<Scheme>(&text).unwrap_err().to_string();
    assert!(err.contains("--fk-a"), "{err}");
    let paper = serde_json::to_string(scheme("paper")).unwrap();
    for bad in ["#fbf8f", "fbf8f1", "#fbf8fz", "#fbf8f1a"] {
        let text = paper.replace("#fbf8f1", bad);
        let err = serde_json::from_str::<Scheme>(&text).unwrap_err().to_string();
        assert!(err.contains("not #rrggbb"), "{bad}: {err}");
    }
}

#[test]
fn every_built_in_scheme_passes_the_gate_and_canonical_solarized_fails_it() {
    for (name, s) in schemes() {
        assert_eq!(gate(s), [], "{name}");
    }
    let text = std::fs::read_to_string(root().join("fixtures/schemes/solarized-canonical.json")).unwrap();
    let misses = gate(&serde_json::from_str(&text).unwrap());
    assert!(
        misses.iter().any(|m| m.what == "--mute on --bg" && m.got < m.min),
        "{misses:?}"
    );
}

#[test]
fn paper_has_one_set_of_values() {
    let paper = scheme("paper");
    assert_eq!(paper.label, "Paper");
    assert_eq!(paper.tokens.bg.as_str(), "#fbf8f1");
    assert_eq!(paper.tokens.fg.as_str(), "#24292f");
}

#[test]
fn css_sets_every_token_for_both_modes() {
    let out = css(&PerMode {
        dark: scheme("github-dark").clone(),
        light: scheme("paper").clone(),
    });
    let (light, dark) = out.split_once("@media (prefers-color-scheme: dark)").unwrap();
    for (k, v) in scheme("paper").tokens.all() {
        assert!(light.contains(&format!("{k}:{};", v.as_str())), "{k}");
    }
    for (k, v) in scheme("github-dark").tokens.all() {
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
    assert_eq!(names, ["farm", "garden", "kitchen"]);
    for p in packs() {
        for (file, bytes) in p.files {
            assert_eq!(*bytes, std::fs::read(dir.join(p.name).join(file)).unwrap().as_slice());
        }
        let json = p.files.iter().find(|(f, _)| *f == "theme.json").unwrap().1;
        let t: Theme = serde_json::from_slice(json).unwrap();
        assert!(EXPECTED.contains(&t.scheme.dark.as_str()), "{}", p.name);
        assert!(EXPECTED.contains(&t.scheme.light.as_str()), "{}", p.name);
    }
}
