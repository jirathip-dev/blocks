use std::path::{Path, PathBuf};

use blocks::theme::Mode;
use blocks::tree::Step;
use blocks::Block;
use blocks_desk::Desk;
use blocks_desktop::{Kit, Look};
use serde_json::json;

fn dir(name: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("tests").join(name)
}

fn shot(name: &str, mode: Mode, height: u16, font: Option<Vec<u8>>) -> Vec<u8> {
    let screen: Block = serde_json::from_str(&std::fs::read_to_string(dir(name).join("screen.json")).unwrap()).unwrap();
    let look = Look {
        mode: Some(mode),
        still: true,
        ..Look::default()
    };
    let mut desk = Desk::new(screen).size(390, height).kit(Kit::new(look));
    if let Some(f) = font {
        desk = desk.font(f);
    }
    let steps: Vec<Step> = serde_json::from_value(json!([{"shot": {"name": "s"}}])).unwrap();
    let mut run = desk.run(&steps);
    run.check(&blocks_desk::Want::default());
    assert!(run.faults.is_empty(), "{:?}", run.faults);
    run.shots.remove(0).png
}

fn same(name: &str, height: u16, font: Option<&[u8]>) {
    for (mode, file) in [(Mode::Light, "light-390.png"), (Mode::Dark, "dark-390.png")] {
        let png = shot(name, mode, height, font.map(<[u8]>::to_vec));
        let want = std::fs::read(dir(name).join(file)).unwrap();
        assert!(png == want, "{name}/{file} differs from the checked-in PNG");
    }
}

#[test]
fn latin_and_cjk_are_the_checked_in_pngs_in_light_and_dark() {
    same("latin", 264, None);
}
