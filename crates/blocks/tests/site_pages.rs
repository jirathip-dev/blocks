use blocks::site;
use blocks::{Built, Screen};

#[test]
fn pages_write_read_only_with_the_pdf_link_each_page_named_and_framed_at_its_size_and_no_buttons() {
    let quote = blocks::samples().into_iter().find(|(k, _)| *k == "pages").unwrap().1;
    let h = site::fragment(&Built::of(&Screen::new().id("s").blocks(vec![quote])), "/act");
    assert!(h.contains("<span class=\"dcc\">3 pages</span>"), "{h}");
    assert!(h.contains("<a class=\"btn\" aria-label=\"download Q-2026-0418 rev 3 as PDF\" href=\"/q/0418.pdf\" target=\"_blank\" rel=\"noopener\"><span>pdf</span></a>"), "{h}");
    assert!(
        h.contains("<div class=\"dcw\" role=\"region\" aria-label=\"Q-2026-0418 rev 3, 3 pages\">"),
        "{h}"
    );
    assert!(h.contains("<figure class=\"dc\" style=\"--pw:1;--a:1240 / 1754\"><img src=\"/q/0418/2.png\" alt=\"Page 2 of 3. Terms and conditions, clauses 1 to 6\" width=\"1240\" height=\"1754\" loading=\"lazy\"></figure>"), "{h}");
    assert!(
        !h.contains("<button") && !h.contains("figcaption") && !h.contains("<script"),
        "{h}"
    );
    let mixed = serde_json::json!({"type": "pages", "id": "m", "pages": [
        {"src": "a.png", "alt": "portrait", "width": 1240, "height": 1754},
        {"src": "javascript:x", "alt": "landscape", "width": 2480, "height": 1754},
    ]});
    let h = site::fragment(&Built::new(mixed), "/act");
    assert!(
        h.contains("style=\"--pw:0.5;--a:1240 / 1754\"><img src=\"a.png\""),
        "{h}"
    );
    assert!(h.contains("<img src=\"\" alt=\"Page 2 of 2. landscape\""), "{h}");
    assert!(
        h.contains("<b class=\"dct\">Document</b><span class=\"dcc\">2 pages</span></div>"),
        "{h}"
    );
    let empty =
        serde_json::json!({"type": "pages", "id": "e", "title": "Report", "pages": [], "note": "Building the pages…"});
    let h = site::fragment(&Built::new(empty), "/act");
    assert!(h.contains("<span class=\"dcc\">no pages</span></div><p class=\"dcn\">Building the pages…</p><div class=\"dce\">No pages yet</div></section>"), "{h}");
}
