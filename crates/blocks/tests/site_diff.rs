use blocks::site;
use blocks::Built;

#[test]
fn a_diff_writes_its_summary_and_lines_its_header_alone_with_no_hunks_and_its_fallback_with_no_hunks_list() {
    let w = |v: serde_json::Value| site::fragment(&Built::new(v), "/act");
    let full = w(
        serde_json::json!({"type": "diff", "file": "a<b", "summary": "+1", "hunks": [{"at": "@@", "lines": [" c", "\\ x", ""]}]}),
    );
    assert!(full.contains("<span class=\"dfs\">+1</span></div><div class=\"dfb\"><div class=\"dfk\">@@</div><div class=\"dfl ctx\"><i class=\"dfm\"> </i>c</div><div class=\"dfl ctx\"><i class=\"dfm\">\\</i> x</div><div class=\"dfl ctx\"><i class=\"dfm\"> </i></div></div>"), "{full}");
    assert!(full.contains("aria-label=\"a&#60;b\""), "{full}");
    let bare = w(serde_json::json!({"type": "diff", "file": "gone.rs", "hunks": []}));
    assert!(
        bare.ends_with("<span class=\"dff\">gone.rs</span></div></div>"),
        "{bare}"
    );
    let odd = w(serde_json::json!({"type": "diff", "file": "a", "fallback": {"title": "Change"}}));
    assert!(
        odd.contains("data-fallback") && odd.contains("Change") && !odd.contains("dfh"),
        "{odd}"
    );
}
