use std::path::{Path, PathBuf};

use blocks::theme::{default, gate, Fills, Scheme, DEFAULT_STYLE};

const TOKENS: [&str; 19] = [
    "--bg", "--card", "--edge", "--line", "--scrim", "--fg", "--mute", "--l", "--link", "--g", "--a", "--r", "--p",
    "--c", "--fk-l", "--fk-p", "--fk-c", "--fk-g", "--fk-a",
];

fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../..")
}

fn read<T: serde::de::DeserializeOwned>(path: &str) -> T {
    serde_json::from_str(&std::fs::read_to_string(root().join(path)).unwrap()).unwrap()
}

#[test]
fn the_default_pair_defines_every_required_token() {
    for s in [&default().light, &default().dark] {
        let keys: Vec<&str> = s.tokens.all().iter().map(|(k, _)| *k).collect();
        assert_eq!(keys, TOKENS, "{}", s.label);
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
fn the_default_pair_passes_the_gate_and_canonical_solarized_fails_it() {
    assert_eq!(gate(&default().light, Fills::Tint), []);
    assert_eq!(gate(&default().dark, Fills::Tint), []);
    let text = std::fs::read_to_string(root().join("fixtures/schemes/solarized-canonical.json")).unwrap();
    let misses = gate(&serde_json::from_str(&text).unwrap(), Fills::Tint);
    assert!(
        misses.iter().any(|m| m.what == "--mute on --bg" && m.got < m.min),
        "{misses:?}"
    );
}

#[test]
fn gate_gives_the_committed_misses_for_every_fixture_scheme() {
    let mut seen = 0;
    for f in std::fs::read_dir(root().join("fixtures/schemes")).unwrap() {
        let name = f.unwrap().file_name().into_string().unwrap();
        let Some(stem) = name.strip_suffix(".json") else {
            continue;
        };
        let want: serde_json::Value = read(&format!("fixtures/schemes/misses/{stem}.json"));
        let text = std::fs::read_to_string(root().join("fixtures/schemes").join(&name)).unwrap();
        match serde_json::from_str::<Scheme>(&text) {
            Err(e) => assert!(e.to_string().contains(want["refused"].as_str().unwrap()), "{stem}: {e}"),
            Ok(s) => {
                let got = gate(&s, Fills::Tint);
                let want = want.as_array().unwrap();
                assert_eq!(got.len(), want.len(), "{stem}: {got:?}");
                for (g, w) in got.iter().zip(want) {
                    assert_eq!(g.what, w["what"].as_str().unwrap());
                    assert!((g.got - w["got"].as_f64().unwrap()).abs() < 1e-9, "{}", g.what);
                    assert!((g.min - w["min"].as_f64().unwrap()).abs() < 1e-9, "{}", g.what);
                }
            }
        }
        seen += 1;
    }
    assert_eq!(seen, 2);
}

#[test]
fn the_default_pair_and_style_are_the_approved_design() {
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
}

#[test]
fn solid_fills_gate_the_background_on_each_full_accent_in_light_and_dark() {
    assert_eq!(gate(&default().dark, Fills::Solid), []);
    let light: Vec<(String, f64)> = gate(&default().light, Fills::Solid)
        .into_iter()
        .map(|m| (m.what, m.min))
        .collect();
    assert_eq!(light, [("--bg on --a".to_owned(), 4.5)]);
    assert_eq!(gate(&default().light, Fills::Outline), []);
}
