use std::path::{Path, PathBuf};

use blocks::theme::{
    check_pack, css, default, gate, Fills, Mode, PerMode, Scheme, Style, Surface, Theme, DEFAULT_STYLE,
};

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
    for (k, v) in DEFAULT_STYLE {
        assert!(light.contains(&format!("{k}:{v};")), "{k}");
    }
}

#[test]
fn css_writes_each_fixtures_css_file_for_the_default_pair_and_each_scheme_in_its_mode() {
    let mut want = vec![
        (
            "default".to_owned(),
            css(default(), &style_of(r#""format": 1, "type": "mono", "radius": 0"#)),
        ),
        (
            "default-still".to_owned(),
            css(default(), &style("fixtures/styles/still.json").unwrap()),
        ),
    ];
    let mut schemes: Vec<PathBuf> = std::fs::read_dir(root().join("fixtures/schemes"))
        .unwrap()
        .map(|e| e.unwrap().path())
        .filter(|p| p.extension().is_some_and(|x| x == "json"))
        .collect();
    schemes.sort();
    for p in schemes {
        let Ok(s) = serde_json::from_str::<Scheme>(&std::fs::read_to_string(&p).unwrap()) else {
            continue;
        };
        let mut pair = default().clone();
        match s.mode {
            Mode::Dark => pair.dark = s,
            Mode::Light => pair.light = s,
        }
        let name = p.file_stem().unwrap().to_string_lossy().into_owned();
        want.push((
            name,
            css(&pair, &style_of(r#""format": 1, "type": "mono", "radius": 0"#)),
        ));
    }
    let dir = root().join("fixtures/css");
    if std::env::var_os("BLOCKS_GEN").is_some() {
        std::fs::create_dir_all(&dir).unwrap();
        for (name, text) in &want {
            std::fs::write(dir.join(format!("{name}.css")), format!("{text}\n")).unwrap();
        }
    }
    let mut files: Vec<String> = std::fs::read_dir(&dir)
        .unwrap()
        .map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
        .collect();
    files.sort();
    let mut names: Vec<String> = want.iter().map(|(n, _)| format!("{n}.css")).collect();
    names.sort();
    assert_eq!(files, names);
    for (name, text) in want {
        assert_eq!(
            std::fs::read_to_string(dir.join(format!("{name}.css"))).unwrap(),
            format!("{text}\n"),
            "{name}"
        );
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
fn solid_fills_read_as_solid_and_the_default_stays_tint() {
    assert_eq!(Fills::default(), Fills::Tint);
    let solid: Style = serde_json::from_str(
        r#"{"format": 2, "type": "default", "radius": 1, "surface": "glass", "fills": "solid", "marks": "symbols", "sections": "title", "labels": {}}"#,
    )
    .unwrap();
    assert_eq!(solid.fills, Fills::Solid);
    assert_eq!(serde_json::to_value(solid).unwrap()["fills"], "solid");
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
