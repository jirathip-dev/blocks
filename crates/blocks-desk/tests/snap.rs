use std::path::{Path, PathBuf};

use blocks::theme::Mode;
use blocks::tree::Step;
use blocks_desk::{Desk, Want};
use blocks_desktop::{Kit, Look};
use serde_json::json;

fn dir(name: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("tests").join(name)
}

fn shot(sample: &str, fonts: &[&str], mode: Mode) -> Vec<u8> {
    let look = Look {
        mode: Some(mode),
        still: true,
        ..Look::default()
    };
    let screen = std::fs::read_to_string(dir(sample).join("screen.json")).unwrap();
    let mut desk = Desk::new(serde_json::from_str(&screen).unwrap())
        .size(390, 420)
        .kit(Kit::new(look));
    for f in fonts {
        desk = desk.font(std::fs::read(dir(f)).unwrap());
    }
    let steps: Vec<Step> = serde_json::from_value(json!([{"shot": {"name": "s"}}])).unwrap();
    let mut run = desk.run(&steps);
    run.check(&Want::default());
    assert!(run.faults.is_empty(), "{sample}: {:?}", run.faults);
    run.shots.remove(0).png
}

fn same(sample: &str, fonts: &[&str]) {
    for (mode, name) in [(Mode::Light, "light-390.png"), (Mode::Dark, "dark-390.png")] {
        let want = std::fs::read(dir(sample).join(name)).unwrap();
        assert!(shot(sample, fonts, mode) == want, "{sample}/{name} differs");
    }
}

#[test]
fn latin_thai_and_cjk_are_the_checked_in_pngs_in_light_and_dark() {
    same("scripts", &["thai/NotoSansThai-Regular.ttf"]);
}
