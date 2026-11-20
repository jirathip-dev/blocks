use blocks::site;
use blocks::{Block, Built, Screen};

#[test]
fn a_toast_writes_one_quiet_line_with_no_undo_and_an_empty_one_its_fallback_done() {
    let toast = blocks::samples().into_iter().find(|(k, _)| *k == "toast").unwrap().1;
    let h = site::fragment(&Built::of(&Screen::new().id("s").blocks(vec![toast])), "/act");
    assert!(h.contains("<div class=\"tst inl ok b b-toast\" data-block=\"toast\" data-id=\"archived\" data-tone=\"ok\" role=\"status\" aria-label=\"Archived 3 orders\"><i class=\"tsg\" aria-hidden=\"true\">✓</i><span class=\"tsx\">Archived 3 orders</span></div>"), "{h}");
    assert!(!h.contains("unarchive") && !h.contains("<button"), "{h}");
    let plain = site::fragment(
        &Built::new(serde_json::json!({"type": "toast", "title": "Copied", "tone": "info"})),
        "/act",
    );
    assert!(plain.starts_with("<div class=\"tst inl b b-toast\""), "{plain}");
    assert!(plain.contains("<i class=\"tsg\" aria-hidden=\"true\"></i>"), "{plain}");
    for (v, want) in [
        (serde_json::json!({"type": "toast", "id": "e", "title": ""}), "Done"),
        (
            serde_json::json!({"type": "toast", "id": "e", "title": "", "fallback": {"title": "Saved"}}),
            "Saved",
        ),
    ] {
        let h = site::fragment(&Built::new(v), "/act");
        assert!(
            h.starts_with("<div class=\"b b-toast\" data-block=\"toast\" data-id=\"e\" data-fallback=\"\""),
            "{h}"
        );
        assert!(h.contains(&format!(">{want}<")), "{h}");
    }
    let empty = Built::of(
        &Screen::new()
            .id("s")
            .blocks(vec![Block::Toast(Box::new(blocks::Toast::new("")))]),
    );
    assert_eq!(empty.value()["blocks"][0]["fallback"]["title"], "Done");
}
