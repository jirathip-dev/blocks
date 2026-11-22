use std::path::{Path, PathBuf};

use blocks::theme::{Easing, Fills, Style, Surface};

fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../..")
}

fn style(path: &str) -> Result<Style, String> {
    serde_json::from_str(&std::fs::read_to_string(root().join(path)).unwrap()).map_err(|e| e.to_string())
}

#[test]
fn every_good_style_fixture_reads_and_format_1_gets_the_default_space_motion_and_easing() {
    for name in ["modern", "still", "terminal"] {
        style(&format!("fixtures/styles/{name}.json")).unwrap();
    }
    let t = style("fixtures/styles/terminal.json").unwrap();
    assert_eq!((f64::from(t.space), f64::from(t.motion)), (1.0, 1.0));
    assert_eq!(t.surface, Surface::Dashed);
    assert_eq!(t.easing, Easing::Standard);
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
fn every_easing_starts_and_ends_in_place_and_overshoots_by_at_most_a_tenth() {
    for e in [Easing::Standard, Easing::Calm, Easing::Bouncy] {
        let inner = e
            .curve()
            .strip_prefix("cubic-bezier(")
            .unwrap()
            .strip_suffix(')')
            .unwrap();
        let p: Vec<f64> = inner.split(", ").map(|n| n.parse().unwrap()).collect();
        let (x1, y1, x2, y2) = (p[0], p[1], p[2], p[3]);
        assert!((0.0..=1.0).contains(&x1) && (0.0..=1.0).contains(&x2), "{e:?}");
        let at = |t: f64, a: f64, b: f64| 3.0 * (1.0 - t).powi(2) * t * a + 3.0 * (1.0 - t) * t * t * b + t.powi(3);
        let ys: Vec<f64> = (0..=1000).map(|i| at(f64::from(i) / 1000.0, y1, y2)).collect();
        let (lo, hi) = ys
            .iter()
            .fold((0.0_f64, 1.0_f64), |(lo, hi), y| (lo.min(*y), hi.max(*y)));
        assert!(lo >= -0.1 && hi <= 1.1, "{e:?}: {lo}..{hi}");
    }
}
