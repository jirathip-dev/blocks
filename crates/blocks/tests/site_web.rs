use blocks::site;
use blocks::Built;

#[test]
fn a_web_block_whose_src_is_not_http_or_https_writes_a_muted_box_with_no_frame_or_link() {
    for src in [
        "javascript:alert(1)",
        "java\tscript:alert(1)",
        "java\nscript:alert(1)",
        " \u{1}JavaScript:alert(1)",
        "data:text/html,x",
    ] {
        let b = Built::new(serde_json::json!({"type": "web", "id": "w", "src": src, "height": 120}));
        let h = site::fragment(&b, "/act");
        assert!(!h.contains("<iframe") && !h.contains("<a "), "{src:?}: {h}");
        assert!(
            h.contains("<div class=\"wf none\" style=\"height:120px\">This page can&#39;t be shown here.</div>"),
            "{src:?}: {h}"
        );
    }
    let b = Built::new(serde_json::json!({"type": "web", "id": "w", "src": "/doc", "height": 9}));
    assert!(site::fragment(&b, "/act").contains("<iframe"));
}
