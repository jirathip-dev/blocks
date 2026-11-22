use std::path::{Path, PathBuf};

use blocks::theme::{
    css, default, Easing, Fills, LabelCase, LabelRole, Marks, Mode, PerMode, Scheme, Sections, Style, Surface,
    TypeDesign, DEFAULT_STYLE,
};

fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../..")
}

fn style(path: &str) -> Result<Style, String> {
    serde_json::from_str(&std::fs::read_to_string(root().join(path)).unwrap()).map_err(|e| e.to_string())
}

fn style_of(head: &str) -> Style {
    let rest = r#""surface": "glass", "fills": "tint", "marks": "symbols", "sections": "title", "labels": {}"#;
    serde_json::from_str(&format!("{{{head}, {rest}}}")).unwrap()
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
    assert!(light.contains("--radius:6px;"), "{light}");
    let base = css(pair, &style);
    for (k, v) in DEFAULT_STYLE {
        assert!(base.contains(&format!("{k}:{v};")), "{k}");
    }
}

#[test]
fn a_serif_style_sets_labels_in_a_serif_system_stack_and_the_others_set_no_font() {
    let serif = style_of(r#""format": 2, "type": "serif", "radius": 0"#);
    assert_eq!(serde_json::to_value(serif.type_).unwrap(), "serif");
    assert!(css(default(), &serif).contains(":root{font-family:ui-serif,Georgia,Cambria,serif}"));
    for t in ["default", "mono"] {
        let out = css(
            default(),
            &style_of(&format!(r#""format": 1, "type": "{t}", "radius": 0"#)),
        );
        assert!(!out.contains("serif,"), "{t}");
    }
    assert_eq!(TypeDesign::default(), TypeDesign::Default);
    assert!(serde_json::from_str::<Style>(r#"{"format": 1, "type": "sans"}"#)
        .unwrap_err()
        .to_string()
        .contains("expected one of `default`, `mono`, `serif`"));
}

#[test]
fn css_writes_each_fixtures_css_file_for_the_default_pair_and_each_scheme_in_its_mode() {
    let mut want = vec![(
        "default".to_owned(),
        css(default(), &style_of(r#""format": 1, "type": "mono", "radius": 0"#)),
    )];
    for name in ["modern", "still", "terminal"] {
        let s = style(&format!("fixtures/styles/{name}.json")).unwrap();
        want.push((format!("default-{name}"), css(default(), &s)));
    }
    want.push((
        "default-serif".to_owned(),
        css(default(), &style_of(r#""format": 1, "type": "serif", "radius": 0"#)),
    ));
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

fn with(axis: &str, value: serde_json::Value) -> Style {
    let mut v = serde_json::to_value(style_of(r#""format": 1, "type": "mono", "radius": 0"#)).unwrap();
    v[axis] = value;
    serde_json::from_value(v).unwrap()
}

fn walk<T: Copy>(all: &[T], style: impl Fn(T) -> Style, rule: impl Fn(T) -> String) {
    let base = css(default(), &style(all[0]));
    for v in all {
        let got = css(default(), &style(*v));
        let want = rule(*v);
        assert!(got.contains(&want), "{want}: {got}");
        assert_eq!(
            got.replacen(&want, "", 1),
            base.replacen(&rule(all[0]), "", 1),
            "{want}"
        );
    }
}

fn value<T: serde::Serialize>(axis: &'static str) -> impl Fn(T) -> Style {
    move |v| with(axis, serde_json::to_value(v).unwrap())
}

#[test]
fn every_value_of_every_style_enum_writes_its_own_rule_and_nothing_else() {
    walk(TypeDesign::ALL, value("type"), |v| v.css().to_owned());
    walk(Surface::ALL, value("surface"), |v| v.css().to_owned());
    walk(Fills::ALL, value("fills"), |v| v.css().to_owned());
    walk(Marks::ALL, value("marks"), |v| v.css().to_owned());
    walk(Sections::ALL, value("sections"), |v| v.css().to_owned());
    walk(Easing::ALL, value("easing"), |v| format!("--ease:{};", v.curve()));
    for role in LabelRole::ALL {
        let labelled = |case: LabelCase| {
            let label = serde_json::json!({ "prefix": "\"", "suffix": "]", "case": case });
            with(
                "labels",
                serde_json::json!({ (serde_json::to_value(role).unwrap().as_str().unwrap()): label }),
            )
        };
        walk(LabelCase::ALL, labelled, |case| {
            role.selector().map_or_else(String::new, |at| {
                format!(
                    "{at}{{text-transform:{}}}{at}::before{{content:\"\\\"\"}}{at}::after{{content:\"]\"}}",
                    case.css()
                )
            })
        });
        let plain = css(default(), &with("labels", serde_json::json!({})));
        assert_eq!(
            css(default(), &labelled(LabelCase::AsIs)) == plain,
            role.selector().is_none(),
            "{role:?}"
        );
    }
}
