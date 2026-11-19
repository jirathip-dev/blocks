use std::path::Path;

use blocks::tree::{check, expect, Drawn as Way, Node};
use blocks::{Block, Built};
use blocks_desktop::{kinds, Kit, Stage};
use egui::accesskit::TreeUpdate;

fn pass(stage: &mut Stage) -> TreeUpdate {
    let ctx = egui::Context::default();
    ctx.enable_accesskit();
    let kit = Kit::default();
    let mut out = ctx.run_ui(egui::RawInput::default(), |ui| {
        stage.show(ui, &kit, 0.0);
    });
    out.textures_delta.clear();
    out.platform_output.accesskit_update.unwrap()
}

fn every(n: &Node, f: &mut impl FnMut(&Node)) {
    f(n);
    n.children.iter().for_each(|c| every(c, f));
}

fn fixtures() -> Vec<(String, serde_json::Value)> {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures");
    let mut out = vec![];
    for dir in ["blocks", "stress"] {
        for e in std::fs::read_dir(root.join(dir)).unwrap() {
            let p = e.unwrap().path();
            if dir == "stress" && p.ends_with("table.json") {
                continue;
            }
            let v = serde_json::from_str(&std::fs::read_to_string(&p).unwrap()).unwrap();
            out.push((format!("{dir}/{}", p.file_name().unwrap().to_string_lossy()), v));
        }
    }
    assert!(out.len() > 60, "{} fixtures", out.len());
    out
}

fn staged(v: serde_json::Value) -> Stage {
    let mut stage = Stage::default();
    stage.set(Some(&serde_json::from_value(v).unwrap()));
    pass(&mut stage);
    stage
}

#[test]
fn the_five_kinds_of_the_first_slice_are_drawn_and_the_rest_are_gaps() {
    assert_eq!(kinds(), ["screen", "section", "list", "row", "text"]);
}

#[test]
fn every_fixture_draws_the_tree_the_crate_expects_with_rects_and_author_ids() {
    for (name, v) in fixtures() {
        let block: Block = serde_json::from_value(v.clone()).unwrap_or_else(|e| panic!("{name}: {e}"));
        let mut stage = Stage::default();
        stage.set(Some(&block));
        let update = pass(&mut stage);
        let drawn = stage.drawn().unwrap_or_else(|| panic!("{name}: nothing drawn"));
        let want = expect(&Built::new(v), &kinds(), stage.state());
        let faults = check(Some(&drawn.tree), &want, &name);
        assert!(faults.is_empty(), "{faults:#?}");
        let authors: Vec<_> = update.nodes.iter().filter_map(|(_, n)| n.author_id()).collect();
        every(&drawn.tree, &mut |n| {
            assert_eq!(n.rect.is_some(), n.drawn != Way::Hidden, "{name}: {n:?}");
            if let (Some(id), true) = (&n.id, n.drawn != Way::Hidden) {
                assert!(
                    authors.contains(&format!("block:{id}").as_str()),
                    "{name}: no block:{id}"
                );
                assert!(drawn.blocks.contains(id) && drawn.hits.contains_key(id), "{name}: {id}");
            }
        });
    }
}

#[test]
fn a_gap_kind_draws_its_fallback_row_then_its_blocks() {
    let stage = staged(
        serde_json::json!({"type": "card", "id": "c", "title": "Ask", "blocks": [
            {"type": "text", "id": "t", "text": "inside"},
            {"type": "button", "id": "b", "label": "Go"}
        ]}),
    );
    let tree = &stage.drawn().unwrap().tree;
    let ways: Vec<_> = tree.children.iter().map(|c| (c.kind.as_str(), c.drawn)).collect();
    assert_eq!(tree.drawn, Way::Fallback);
    assert_eq!(ways, [("text", Way::Native), ("button", Way::Fallback)]);
    assert!(tree.rect.unwrap()[3] > tree.children[0].rect.unwrap()[3]);
}

#[test]
fn a_hidden_block_is_recorded_hidden_with_no_rect_and_set_none_empties_the_stage() {
    let mut stage = staged(serde_json::json!({"type": "screen", "id": "s", "blocks": [
        {"type": "text", "id": "on", "text": "a"},
        {"type": "text", "id": "off", "text": "b", "show": {"get": "never"}}
    ]}));
    let kids = &stage.drawn().unwrap().tree.children;
    assert_eq!((kids[0].drawn, kids[1].drawn), (Way::Native, Way::Hidden));
    assert!(kids[1].rect.is_none());
    assert_eq!(stage.drawn().unwrap().blocks, ["s", "on"]);
    stage.set(None);
    assert!(stage.drawn().is_none());
}
