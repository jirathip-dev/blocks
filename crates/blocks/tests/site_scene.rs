use blocks::site;
use blocks::Built;

#[test]
fn a_scene_lane_links_its_url_or_open_marks_any_other_tap_a_button_and_ticks_its_age() {
    let b = Built::new(serde_json::json!({"type": "scene", "id": "s", "lanes": [
        {"id": "a", "title": "pr", "state": "merged", "tap": {"url": "https://x.test/63"}},
        {"id": "b", "title": "lane", "state": "working", "tap": {"open": "impl"}, "stage": "impl", "since": "2026-11-19T12:00:00Z"},
        {"id": "c", "title": "act", "state": "needs", "tap": {"action": "go"}, "tool": "claude"},
        {"id": "d", "title": "plain", "state": "idle"}
    ]}));
    let h = site::fragment(&b, "/act");
    assert!(
        h.starts_with("<div class=\"scn b b-scene\" data-block=\"scene\" data-id=\"s\" role=\"group\" aria-label=\"s\"><ul class=\"scl\">"),
        "{h}"
    );
    assert!(h.contains("<a class=\"ln merged tap\" data-id=\"a\" aria-label=\"pr, merged\" href=\"https://x.test/63\" target=\"_blank\" rel=\"noopener\">"), "{h}");
    assert!(
        h.contains("<a class=\"ln working tap\" data-id=\"b\" aria-label=\"lane, working\" href=\"impl\">"),
        "{h}"
    );
    assert!(h.contains("<span class=\"lnx\">impl · <span data-tick=\"{&#34;since&#34;:&#34;2026-11-19T12:00:00Z&#34;}\"></span></span>"), "{h}");
    assert!(
        h.contains(
            "<div class=\"ln needs tap\" data-id=\"c\" aria-label=\"act, needs\" role=\"button\" tabindex=\"0\" data-action=\"go\">"
        ),
        "{h}"
    );
    assert!(h.contains("<span class=\"lnx\">claude</span>"), "{h}");
    assert!(h.contains("<div class=\"ln idle\" data-id=\"d\" aria-label=\"plain, idle\"><i class=\"lnm\"></i><span class=\"lnb\"><span class=\"lnh\"><span class=\"lnt\">plain</span><span class=\"lns\">idle</span></span></span></div>"), "{h}");
}
