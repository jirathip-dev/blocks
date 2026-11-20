use std::path::Path;

use blocks::behave::{start, view};
use blocks::theme::Theme;
use blocks::tree::{check, expect, Drawn as Way, Node};
use blocks::{Block, Built};
use blocks_desktop::{kinds, Kit, Pack, Stage};
use egui::accesskit::TreeUpdate;

fn pass_with(stage: &mut Stage, kit: &Kit, now: f64) -> TreeUpdate {
    let ctx = egui::Context::default();
    ctx.enable_accesskit();
    let mut out = ctx.run_ui(egui::RawInput::default(), |ui| {
        stage.show(ui, kit, now);
    });
    out.textures_delta.clear();
    out.platform_output.accesskit_update.unwrap()
}

fn pass(stage: &mut Stage) -> TreeUpdate {
    pass_with(stage, &Kit::default(), 0.0)
}

fn labels(u: &TreeUpdate) -> Vec<String> {
    u.nodes
        .iter()
        .filter_map(|(_, n)| n.value().map(String::from))
        .collect()
}

fn root() -> std::path::PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures")
}

fn json(path: &str) -> serde_json::Value {
    serde_json::from_str(&std::fs::read_to_string(root().join(path)).unwrap()).unwrap()
}

fn every(n: &Node, f: &mut impl FnMut(&Node)) {
    f(n);
    n.children.iter().for_each(|c| every(c, f));
}

fn fixtures() -> Vec<(String, serde_json::Value)> {
    let root = root();
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
fn the_kinds_of_the_first_fourth_and_fifth_slices_are_drawn_and_the_rest_are_gaps() {
    assert_eq!(
        kinds(),
        [
            "screen", "sheet", "section", "list", "row", "card", "choice", "form", "config", "secret", "run", "button",
            "chips", "stat", "text"
        ]
    );
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
        serde_json::json!({"type": "hero", "id": "c", "title": "Ask", "blocks": [
            {"type": "text", "id": "t", "text": "inside"},
            {"type": "toast", "id": "f", "title": "Saved"}
        ]}),
    );
    let tree = &stage.drawn().unwrap().tree;
    let ways: Vec<_> = tree.children.iter().map(|c| (c.kind.as_str(), c.drawn)).collect();
    assert_eq!(tree.drawn, Way::Fallback);
    assert_eq!(ways, [("text", Way::Native), ("toast", Way::Fallback)]);
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

#[test]
fn behave_view_cases_end_in_the_crates_view_through_the_stage() {
    let v = json("behave/view.json")["screen"].clone();
    let built = Built::new(v.clone());
    let mut stage = Stage::default();
    stage.set(Some(&serde_json::from_value(v).unwrap()));
    let update = pass(&mut stage);
    assert_eq!(stage.state(), &start(&built));
    let want = view(&built, stage.state());
    let drawn = stage.drawn().unwrap();
    let mut hidden = vec![];
    every(&drawn.tree, &mut |n| {
        if n.drawn == Way::Hidden {
            hidden.push(n.id.clone().unwrap());
        }
    });
    hidden.sort();
    let blocks: Vec<_> = want.hidden.iter().filter(|h| *h != "seats").cloned().collect();
    assert_eq!(hidden, blocks);
    for id in want.disabled.iter().filter(|d| drawn.hits.contains_key(*d)) {
        assert!(!drawn.hits[id].live, "{id} is disabled but live");
    }
    assert!(drawn.hits["join"].rect[3] > 0.0 && !drawn.hits["join"].live);
    for act in ["save", "help"] {
        assert_eq!(drawn.hits[act].live, !want.acts.contains(act), "{act}");
    }
    assert!(drawn.hits["more"].live && drawn.hits["more"].tap.is_some());
    assert_eq!(drawn.actions, ["save", "help", "join"]);
    let shown = labels(&update);
    for value in want.values.values() {
        assert!(shown.iter().any(|l| l == value), "no {value} in {shown:?}");
    }
}

#[test]
fn ages_read_the_clock_the_app_hands_the_pass() {
    let file = json("times/labels.json");
    let now = 1_794_217_200.0;
    for c in file["cases"].as_array().unwrap() {
        let mut stage = Stage::default();
        let stat = serde_json::json!({"type": "stat", "id": "t", "label": "x", "value": c["value"]});
        stage.set(Some(&serde_json::from_value(stat).unwrap()));
        let shown = labels(&pass_with(&mut stage, &Kit::default(), now));
        let want = c["want"].as_str().unwrap();
        assert!(shown.iter().any(|l| l == want), "{want} not in {shown:?}");
    }
}

#[test]
fn a_pack_says_its_words_and_plain_says_the_plain_ones() {
    let theme: Theme = serde_json::from_value(json("packs/plain/theme.json")).unwrap();
    let section = serde_json::json!({"type": "section", "id": "s", "header": "working now", "blocks": []});
    let mut stage = Stage::default();
    stage.set(Some(&serde_json::from_value(section).unwrap()));
    let packed = labels(&pass_with(&mut stage, &Kit::default().art(Pack(theme)), 0.0));
    assert!(packed.iter().any(|l| l == "busy · working now"), "{packed:?}");
    let plain = labels(&pass(&mut stage));
    assert!(plain.iter().any(|l| l == "working now"), "{plain:?}");
}

#[test]
fn each_control_names_its_block_and_its_actions_as_swiftui_does() {
    for (file, actions) in [
        ("button", vec!["save"]),
        ("choice", vec!["answer"]),
        ("run", vec!["approve", "approve"]),
        ("chips", vec![]),
        ("stat", vec![]),
        ("card", vec![]),
    ] {
        let v = json(&format!("blocks/{file}.json"));
        let id = v["id"].as_str().unwrap().to_owned();
        let mut stage = Stage::default();
        stage.set(Some(&serde_json::from_value(v).unwrap()));
        let update = pass(&mut stage);
        let authors: Vec<_> = update.nodes.iter().filter_map(|(_, n)| n.author_id()).collect();
        assert!(authors.contains(&format!("block:{id}").as_str()), "{file}: {authors:?}");
        for a in &actions {
            assert!(authors.contains(&format!("action:{a}").as_str()), "{file}: {authors:?}");
        }
        assert_eq!(stage.drawn().unwrap().actions, actions, "{file}");
    }
}

#[test]
fn a_typed_secret_stays_out_of_the_accessible_text_and_the_state_while_a_typed_text_lands_in_state() {
    let ctx = egui::Context::default();
    ctx.enable_accesskit();
    let mut stage = Stage::default();
    let form = serde_json::json!({"type": "form", "id": "f", "fields": [
        {"type": "text", "name": "who", "label": "Who"},
        {"type": "secret", "name": "key", "label": "Key"}
    ]});
    stage.set(Some(&serde_json::from_value(form).unwrap()));
    let mut run = |events: Vec<egui::Event>| {
        let input = egui::RawInput {
            events,
            ..Default::default()
        };
        let mut out = ctx.run_ui(input, |ui| {
            stage.show(ui, &Kit::default(), 0.0);
        });
        out.textures_delta.clear();
        let update = out.platform_output.accesskit_update.unwrap();
        (stage.drawn().unwrap().hits.clone(), stage.state().clone(), update)
    };
    let (hits, ..) = run(vec![]);
    let mut seen = vec![];
    for (name, text) in [("who", "Ada"), ("key", "hunter2-secret")] {
        let [x, y, w, h] = hits[name].field.unwrap();
        let mid = |a: f64, b: f64| egui::emath::Numeric::from_f64(a + b / 2.0);
        let pos = egui::pos2(mid(x, w), mid(y, h));
        let press = |pressed| egui::Event::PointerButton {
            pos,
            button: egui::PointerButton::Primary,
            pressed,
            modifiers: egui::Modifiers::NONE,
        };
        run(vec![egui::Event::PointerMoved(pos), press(true)]);
        run(vec![press(false)]);
        run(vec![egui::Event::Text(text.into())]);
        seen.push(run(vec![]));
    }
    let (_, last, update) = seen.pop().unwrap();
    assert_eq!(last["who"], blocks::expr::Lit::Str("Ada".into()));
    assert!(!format!("{last:?}").contains("hunter2"), "{last:?}");
    let values = labels(&update);
    assert!(values.iter().any(|v| v == "Ada"), "{values:?}");
    assert!(values.iter().any(|v| v.starts_with('•')), "{values:?}");
    assert!(!format!("{update:?}").contains("hunter2"));
}
