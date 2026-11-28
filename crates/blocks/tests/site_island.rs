use blocks::site;
use blocks::Built;

#[test]
fn an_island_is_its_element_with_its_props_and_fallback_and_a_bad_name_a_plain_fallback() {
    let island = |name: &str| {
        let b = serde_json::json!({"type": "island", "id": "m", "name": name, "props": {"q": "<a&b>"}, "fallback": {"title": "The map"}});
        site::fragment(&Built::new(b), "/act")
    };
    assert_eq!(
        island("x-map"),
        "<x-map class=\"b b-island\" data-block=\"island\" data-id=\"m\" data-fallback=\"\" data-props=\"{&#34;q&#34;:&#34;&#60;a&#38;b&#62;&#34;}\" role=\"group\" aria-label=\"x-map\"><div class=\"row\" data-id=\"\"><span class=\"rm\"><span class=\"rt b-row__title as-title-label\">The map</span></span></div></x-map>"
    );
    for bad in ["x map", "map", "X-map", "x-<b>", "1-x"] {
        let h = island(bad);
        assert!(h.starts_with("<div class=\"b b-island\""), "{bad:?}: {h}");
        assert!(h.ends_with("</div></div>") && h.contains("The map"), "{bad:?}: {h}");
    }
}
