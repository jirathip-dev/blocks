use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use blocks::layout::{check, merge, Component, Content, Contract, Place, PlaceEntry, PlaceKind, SizeClass, Transition};

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
