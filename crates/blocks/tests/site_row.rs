use blocks::site;
use blocks::Built;

#[test]
fn a_row_with_rounds_writes_its_fold_open_when_the_last_round_needs_you_and_folded_otherwise() {
    let row = |last: &str| {
        Built::new(
            serde_json::json!({"type": "row", "id": "i", "title": "#23", "subtitle": "review", "tap": {"open": "x"}, "rounds": [
                {"id": "a", "name": "impl", "state": "done", "tap": {"action": "see", "values": {"n": 1}}, "since": "2026-11-19T12:00:00Z"},
                {"id": "b", "name": "rev", "state": last, "summary": "busy", "tap": {"open": "never"},
                 "lane": {"name": "rev-1", "host": "mini", "lines": ["a", "b"]}, "links": [{"label": "go", "tap": {"action": "go"}}]}
            ]}),
        )
    };
    let open = site::fragment(&row("needs"), "/act");
    assert!(open.starts_with("<div class=\"rr open b b-row\" data-block=\"row\" data-id=\"i\" role=\"group\" aria-label=\"#23\"><div class=\"row tap\" data-id=\"i\" tabindex=\"0\" role=\"button\" aria-expanded=\"true\"><span class=\"rm\"><span class=\"rt b-row__title as-title-label\">#23</span></span><span class=\"rc\">›</span></div><ol class=\"rds\">"), "{open}");
    assert!(open.contains("<li class=\"rd done\"><i class=\"rdm\" aria-label=\"done\"></i><div class=\"rdx\"><div class=\"rdl tap\" tabindex=\"0\" role=\"button\" data-action=\"see\"><span class=\"rdn\">impl</span><span class=\"rdu\"></span><span class=\"rdt\"><span data-tick=\"{&#34;since&#34;:&#34;2026-11-19T12:00:00Z&#34;}\"></span></span><span class=\"rc\">›</span></div></div></li>"), "{open}");
    assert!(open.contains("<li class=\"rd needs now\"><i class=\"rdm\" aria-label=\"needs\"></i><div class=\"rdx\"><div class=\"rdl\"><span class=\"rdn\">rev</span><span class=\"rdu\">busy</span></div><div class=\"rdb\"><div class=\"rdh\">rev-1 · mini</div><div class=\"rdo\"><div>a</div><div>b</div></div><div class=\"rdk\"><button type=\"submit\" form=\"b-f1\" data-action=\"go\"><span>go</span></button></div></div></div></li></ol></div>"), "{open}");
    let live = site::fragment(&row("working"), "/act");
    assert!(live.starts_with("<div class=\"rr b b-row\" data-block=\"row\" data-id=\"i\" role=\"group\" aria-label=\"#23\"><div class=\"row tap\" data-id=\"i\" tabindex=\"0\" role=\"button\" aria-expanded=\"false\"><span class=\"rm\"><span class=\"rt b-row__title as-title-label\">#23</span><span class=\"rs b-row__subtitle \">review</span></span><span class=\"rc\">›</span></div></div>"), "{live}");
}
