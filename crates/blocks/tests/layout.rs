use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use blocks::layout::{
    check, drops, edit, merge, slots, Component, Content, Contract, Edit, Layout, Node, Place, PlaceEntry, PlaceKind,
    SizeClass, Transition,
};
use serde_json::Value;

static COOEE: Contract = Contract {
    components: &[
        Component {
            kind: "sidebar",
            slots: &["top", "list"],
            config: &["width", "pinned"],
        },
        Component {
            kind: "chat",
            slots: &["strip", "cards"],
            config: &["composer", "stop", "back"],
        },
        Component {
            kind: "composer",
            slots: &[],
            config: &["attach", "queue", "hint"],
        },
        Component {
            kind: "terminal",
            slots: &[],
            config: &["rows", "cols", "machine"],
        },
        Component {
            kind: "scanner",
            slots: &[],
            config: &[],
        },
        Component {
            kind: "menu-host",
            slots: &["rows"],
            config: &[],
        },
        Component {
            kind: "settings",
            slots: &[],
            config: &["pages"],
        },
    ],
    locked: &["/screens/pairing", "/screens/reset-layout"],
};

fn dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/layouts")
}

fn read(name: &str) -> String {
    std::fs::read_to_string(dir().join(name)).unwrap()
}

#[test]
fn each_bad_fixture_is_refused_with_its_reason() {
    let refused: BTreeMap<String, String> = serde_json::from_str(&read("refused.json")).unwrap();
    let mut files: Vec<String> = std::fs::read_dir(dir().join("bad"))
        .unwrap()
        .map(|e| e.unwrap().file_name().to_string_lossy().replace(".json", ""))
        .collect();
    files.sort();
    assert_eq!(files, refused.keys().cloned().collect::<Vec<_>>());
    assert_eq!(files.len(), 12);
    for (name, why) in &refused {
        let broken = check(&read(&format!("bad/{name}.json")), &COOEE).unwrap_err();
        assert_eq!(&broken.why, why, "{name}");
        assert!(broken.line >= 1 && broken.col >= 1, "{name}: {broken:?}");
    }
}

#[test]
fn a_refusal_points_at_the_offending_text() {
    let broken = check(&read("bad/locked-replaced.json"), &COOEE).unwrap_err();
    assert_eq!((broken.line, broken.col), (8, 55));
    let broken = check(&read("bad/not-json.json"), &COOEE).unwrap_err();
    assert_eq!(broken.line, 2);
}

#[test]
fn cooees_default_passes_with_cooees_contract_and_resolves_per_size() {
    let layout = check(&read("cooee.json"), &COOEE).unwrap();
    let wide = layout.resolved(SizeClass::Wide);
    let compact = layout.resolved(SizeClass::Compact);
    assert_eq!(wide.content, Content::Component { kind: "nav".into() });
    assert_eq!(wide.place, Place::Inline);
    let places = |n: &blocks::layout::Resolved, slot: &str| -> Vec<(String, Place)> {
        n.slots[slot].iter().map(|c| (c.id.clone(), c.place)).collect()
    };
    assert_eq!(places(&wide, "side"), [("sidebar".into(), Place::Column)]);
    assert_eq!(places(&compact, "side"), [("sidebar".into(), Place::Menu)]);
    assert_eq!(
        places(&wide, "main"),
        [("home".into(), Place::Panel), ("chat".into(), Place::Push)]
    );
    assert_eq!(places(&compact, "main")[0], ("home".into(), Place::Push));
    assert_eq!(wide.slots["main"][1].config["composer"], true);
    assert_eq!(wide.slots["menu"][2].transition, Transition::Push);
}

#[test]
fn a_served_layout_reads_back_the_same() {
    let layout = check(&read("cooee.json"), &COOEE).unwrap();
    let served = serde_json::to_string(&layout).unwrap();
    assert_eq!(check(&served, &COOEE).unwrap(), layout);
    let resolved = serde_json::to_value(layout.resolved(SizeClass::Wide)).unwrap();
    assert_eq!(resolved["slots"]["side"][0]["place"], "column");
}

#[test]
fn the_limits_are_refused() {
    let rows: Vec<String> = (0..200)
        .map(|i| format!(r#"{{"type": "screen", "source": "core", "path": "/screens/r{i}"}}"#))
        .collect();
    let many = format!(
        r#"{{"format": 1, "root": {{"type": "nav", "slots": {{"main": [{}]}}}}}}"#,
        rows.join(",")
    );
    assert_eq!(check(&many, &COOEE).unwrap_err().why, "over 200 nodes");
    let big = format!(
        "{}{}",
        " ".repeat(64 * 1024),
        r#"{"format": 1, "root": {"type": "nav"}}"#
    );
    assert_eq!(check(&big, &COOEE).unwrap_err().why, "over 65536 bytes");
    let hidden = r#"{"format": 1, "root": {"type": "nav", "place": {"compact": "hidden"}}}"#;
    assert_eq!(check(hidden, &COOEE).unwrap_err().why, "root: may not be hidden");
    let no_contract = Contract {
        components: &[],
        locked: &[],
    };
    let chat = r#"{"format": 1, "root": {"type": "nav", "slots": {"main": [{"type": "chat"}]}}}"#;
    assert_eq!(
        check(chat, &no_contract).unwrap_err().why,
        "root.slots.main[0]: unknown type \"chat\""
    );
}

fn entry(kind: PlaceKind, source: &str, id: &str, screen: &str) -> PlaceEntry {
    PlaceEntry {
        kind,
        source: source.into(),
        id: id.into(),
        label: Some(id.into()),
        screen: screen.into(),
    }
}

#[test]
fn merge_places_a_plugin_the_file_does_not_and_says_why_it_skips_the_rest() {
    let layout = check(&read("cooee.json"), &COOEE).unwrap();
    let places = [
        entry(PlaceKind::HeaderStrip, "drover", "drover-0", "/screens/queue"),
        entry(PlaceKind::MenuRow, "drover", "drover-1", "/screens/herd"),
        entry(PlaceKind::ChatCards, "core", "home-card", "/screens/home-card"),
        entry(PlaceKind::MenuRow, "evil", "evil-0", "/screens/pairing"),
        entry(PlaceKind::MenuRow, "dup", "home", "/screens/x"),
    ];
    let (merged, skipped) = merge(layout.clone(), &places, &COOEE);
    let chat = &merged.root.slots["main"][1];
    assert_eq!(chat.slots["strip"][0].id, "drover-0");
    assert_eq!(chat.slots["strip"][0].place.wide, Place::Strip);
    let menu: Vec<&str> = merged.root.slots["menu"].iter().map(|n| n.id.as_str()).collect();
    assert_eq!(menu, ["menu", "settings", "terminal", "drover-1"]);
    assert_eq!(
        skipped,
        [
            "evil: /screens/pairing: a locked screen can't be placed",
            "dup: /screens/x: id \"home\" is taken",
        ]
    );
    let served = serde_json::to_string(&merged).unwrap();
    assert_eq!(check(&served, &COOEE).unwrap(), merged);
    let bare = check(r#"{"format": 1, "root": {"type": "nav"}}"#, &COOEE).unwrap();
    let (_, skipped) = merge(bare, &places[..1], &COOEE);
    assert_eq!(skipped, ["drover: /screens/queue: no node holds a strip slot"]);
}

static EDITS: Contract = Contract {
    components: &[
        Component {
            kind: "box",
            slots: &["in"],
            config: &[],
        },
        Component {
            kind: "sidebar",
            slots: &["top", "list"],
            config: &[],
        },
    ],
    locked: &["/screens/pairing"],
};

fn outline(n: &Node) -> String {
    if n.slots.is_empty() {
        return n.id.clone();
    }
    let slots: Vec<String> = n
        .slots
        .iter()
        .map(|(k, v)| {
            format!(
                "{k}:{}",
                v.iter().map(|c| format!(" {}", outline(c))).collect::<String>()
            )
        })
        .collect();
    format!("{}({})", n.id, slots.join("; "))
}

fn ids(n: &Node, out: &mut Vec<String>) {
    out.push(n.id.clone());
    n.slots.values().flatten().for_each(|k| ids(k, out));
}

fn edits() -> (Value, Layout) {
    let f: Value = serde_json::from_str(&read("edits.json")).unwrap();
    let l = check(&f["layout"].to_string(), &EDITS).unwrap();
    (f, l)
}

#[test]
fn slots_and_drops_give_fixtures_layouts_edits_on_both_size_classes() {
    let (f, l) = edits();
    assert_eq!(serde_json::to_value(slots(&EDITS)).unwrap(), f["slots"]);
    assert_eq!(outline(&l.root), f["tree"]);
    for (grabbed, want) in f["drops"].as_object().unwrap() {
        let want: Vec<Edit> = serde_json::from_value(want.clone()).unwrap();
        for size in [SizeClass::Compact, SizeClass::Wide] {
            assert_eq!(
                drops(&l.resolved(size), &slots(&EDITS), grabbed),
                want,
                "{grabbed} {size:?}"
            );
        }
    }
}

#[test]
fn an_edit_gives_its_checked_layout_or_its_refusal_and_leaves_the_layout_as_it_was() {
    let (f, l) = edits();
    let before = l.clone();
    for c in f["edits"].as_array().unwrap() {
        let e: Edit = serde_json::from_value(c["edit"].clone()).unwrap();
        let name = &c["name"];
        match (edit(&l, &e, &EDITS), c.get("refused")) {
            (Ok(next), None) => {
                assert_eq!(outline(&next.root), c["tree"], "{name}");
                if let Some(p) = c.get("place") {
                    let id = p["id"].as_str().unwrap();
                    let mut all = vec![&next.root];
                    let mut i = 0;
                    while let Some(n) = all.get(i).copied() {
                        all.extend(n.slots.values().flatten());
                        i += 1;
                    }
                    let n = all.into_iter().find(|n| n.id == id).unwrap();
                    let want = serde_json::json!({ "id": id, "compact": n.place.compact, "wide": n.place.wide });
                    assert_eq!(&want, p, "{name}");
                }
            }
            (Err(b), Some(why)) => assert_eq!(why, &b.why, "{name}"),
            (got, _) => panic!("{name}: {got:?}"),
        }
        assert_eq!(l, before, "{name}");
    }
}

#[test]
fn every_drop_of_every_node_passes_check_on_both_size_classes() {
    for (l, c) in [
        (edits().1, &EDITS),
        (check(&read("cooee.json"), &COOEE).unwrap(), &COOEE),
    ] {
        let mut all = Vec::new();
        ids(&l.root, &mut all);
        let mut n = 0;
        for size in [SizeClass::Compact, SizeClass::Wide] {
            for id in &all {
                for d in drops(&l.resolved(size), &slots(c), id) {
                    let next = edit(&l, &d, c).unwrap_or_else(|b| panic!("{d:?}: {}", b.why));
                    let mut after = Vec::new();
                    ids(&next.root, &mut after);
                    assert_eq!(after.len(), all.len(), "{d:?}");
                    assert_ne!(next, l, "{d:?}");
                    n += 1;
                }
            }
        }
        assert!(n > 40, "{n} drops");
    }
}
