use std::collections::BTreeSet;
use std::path::Path;

use blocks::Block;
use blocks_desktop::{Kit, Look, Stage};
use egui::epaint::text::Glyph;
use egui::{Color32, FontData, FontDefinitions, FontId, RawInput, Shape};

fn ratio(g: &Glyph) -> f32 {
    g.font_face_ascent / g.font_face_height
}

fn drawn(screen: &Block, kit: &Kit) -> (Vec<(char, f32)>, f32) {
    let ctx = egui::Context::default();
    let mut stage = Stage::default();
    stage.set(Some(screen));
    let (mut out, mut bundled) = (vec![], 0.0);
    for _ in 0..3 {
        let mut full = ctx.run_ui(RawInput::default(), |ui| {
            stage.show(ui, kit, 0.0);
            let g = ui.fonts_mut(|f| f.layout_no_wrap("A".into(), FontId::proportional(13.0), Color32::BLACK));
            bundled = ratio(&g.rows[0].row.glyphs[0]);
        });
        full.textures_delta.clear();
        out = full
            .shapes
            .iter()
            .filter_map(|c| match &c.shape {
                Shape::Text(t) => Some(t.galley.clone()),
                _ => None,
            })
            .flat_map(|g| g.rows.iter().flat_map(|r| r.row.glyphs.clone()).collect::<Vec<_>>())
            .filter(|x| !x.chr.is_whitespace())
            .map(|x| (x.chr, ratio(&x)))
            .collect();
    }
    (out, bundled)
}

fn kit(faces: Vec<FontData>) -> Kit {
    Kit::new(Look {
        faces,
        still: true,
        ..Look::default()
    })
}

#[test]
fn an_app_face_draws_every_kinds_text_and_without_one_the_bundled_face_does() {
    let hack = FontDefinitions::default().font_data["Hack"].as_ref().clone();
    let face = kit(vec![hack]);
    let near = |a: f32, b: f32| (a - b).abs() < 0.005;
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/blocks");
    let (mut kinds, mut bare_bundled, mut wrong) = (BTreeSet::new(), 0, vec![]);
    for e in std::fs::read_dir(dir).unwrap() {
        let p = e.unwrap().path();
        let screen: Block = serde_json::from_str(&std::fs::read_to_string(&p).unwrap()).unwrap();
        let (bare, bundled) = drawn(&screen, &kit(vec![]));
        let (with, _) = drawn(&screen, &face);
        let name = p.file_stem().unwrap().to_string_lossy().into_owned();
        if !with.is_empty() {
            kinds.insert(name.clone());
        }
        bare_bundled += bare.iter().filter(|(_, r)| near(*r, bundled)).count();
        wrong.extend(
            with.into_iter()
                .filter(|(_, r)| near(*r, bundled))
                .map(|g| (name.clone(), g)),
        );
    }
    assert!(kinds.len() > 30, "{kinds:?}");
    assert!(bare_bundled > 100, "{bare_bundled}");
    assert!(
        wrong.is_empty(),
        "drawn in the bundled face: {:?}",
        &wrong[..wrong.len().min(20)]
    );
}

fn token(css: &str, name: &str) -> f32 {
    let at = css.find(&format!("{name}:")).unwrap() + name.len() + 1;
    css[at..].split("px").next().unwrap().parse().unwrap()
}

#[test]
fn sizes_and_the_margin_are_the_web_renderers_tokens() {
    let css =
        std::fs::read_to_string(Path::new(env!("CARGO_MANIFEST_DIR")).join("../../web/src/css/base/root.css")).unwrap();
    let screen: Block = serde_json::from_value(
        serde_json::json!({"type": "screen", "id": "s", "title": "Title", "blocks": [
            {"type": "text", "id": "a", "text": "body"},
            {"type": "text", "id": "b", "text": "foot", "style": "footnote"}
        ]}),
    )
    .unwrap();
    let ctx = egui::Context::default();
    let mut stage = Stage::default();
    stage.set(Some(&screen));
    let mut full = ctx.run_ui(RawInput::default(), |ui| {
        stage.show(ui, &kit(vec![]), 0.0);
    });
    full.textures_delta.clear();
    let size = |text: &str| {
        full.shapes.iter().find_map(|c| match &c.shape {
            Shape::Text(t) if t.galley.job.text == text => Some(t.galley.job.sections[0].format.font_id.size),
            _ => None,
        })
    };
    assert_eq!(size("body"), Some(token(&css, "--fs")));
    assert_eq!(size("foot"), Some(token(&css, "--fs-meta")));
    let tree = &stage.drawn().unwrap().tree;
    let [x, y, ..] = tree.children[0].rect.unwrap();
    assert_eq!(x, f64::from(token(&css, "--s4")));
    assert!(y > x);
}
