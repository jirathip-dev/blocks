use blocks::site;
use blocks::Built;

#[test]
fn a_stepper_writes_done_now_and_to_do_steps_and_links_only_a_done_step_that_opens() {
    let b = Built::new(
        serde_json::json!({"type": "steps", "id": "s", "title": "Stop 3", "current": "c", "steps": [
            {"id": "a", "label": "Stop", "sub": "09:42", "tap": {"open": "stop"}},
            {"id": "b", "label": "Lines", "tap": {"action": "lines"}},
            {"id": "c", "label": "Proof", "tap": {"open": "proof"}},
            {"id": "d", "label": "Leave"}
        ]}),
    );
    let h = site::fragment(&b, "/act");
    assert!(h.starts_with("<div class=\"sp b b-steps\" data-block=\"steps\" data-id=\"s\" role=\"group\" aria-label=\"Stop 3\"><div class=\"sh\">Stop 3</div><ol class=\"spl\">"), "{h}");
    assert!(h.contains("<li class=\"spi done\"><a class=\"spc tap\" aria-label=\"Stop, step 1 of 4, done\" title=\"Stop\" href=\"stop\"><span class=\"spr\" aria-hidden=\"true\"><i class=\"spm\">✓</i><span class=\"spk\"></span></span><span class=\"spn\">Stop</span><span class=\"sps\">09:42</span></a></li>"), "{h}");
    assert!(h.contains("<div class=\"spc tap\" aria-label=\"Lines, step 2 of 4, done\" title=\"Lines\" role=\"button\" tabindex=\"0\" data-action=\"lines\">"), "{h}");
    assert!(h.contains("<li class=\"spi now\" aria-current=\"step\"><div class=\"spc\" aria-label=\"Proof, step 3 of 4, current\" title=\"Proof\"><span class=\"spr\" aria-hidden=\"true\"><i class=\"spm\">3</i><span class=\"spk\"></span></span><span class=\"spn\">Proof</span><span class=\"sps\">step 3 of 4</span></div></li>"), "{h}");
    assert!(
        h.contains("<li class=\"spi todo\"><div class=\"spc\" aria-label=\"Leave, step 4 of 4, to do\""),
        "{h}"
    );
    assert!(
        h.ends_with(
            "</ol><div class=\"spx\" aria-hidden=\"true\"><b>Proof</b><span class=\"m\">step 3 of 4</span></div></div>"
        ),
        "{h}"
    );
    let done = Built::new(
        serde_json::json!({"type": "steps", "id": "s", "done": true, "steps": [{"id": "a", "label": "Stop"}]}),
    );
    let h = site::fragment(&done, "/act");
    assert!(
        h.contains("<li class=\"spi done\"><div class=\"spc\" aria-label=\"Stop, step 1 of 1, done\""),
        "{h}"
    );
    assert!(h.contains("<b>All done</b><span class=\"m\">1 of 1</span>"), "{h}");
}

#[test]
fn bars_write_a_clamped_progressbar_each_and_no_steps_or_no_bars_write_the_fallback() {
    let b = Built::new(
        serde_json::json!({"type": "steps", "id": "p", "title": "Week 47", "bars": [
            {"label": "Boiler", "value": 130, "tone": "ok", "sub": "done Mon"},
            {"label": "Lights", "value": 0}
        ]}),
    );
    let h = site::fragment(&b, "/act");
    assert!(h.starts_with("<div class=\"pg b b-steps\" data-block=\"steps\" data-id=\"p\" role=\"group\" aria-label=\"Week 47\"><div class=\"sh\">Week 47</div><div class=\"pgl rows\">"), "{h}");
    assert!(h.contains("<div class=\"pgr ok\" role=\"progressbar\" aria-valuemin=\"0\" aria-valuemax=\"100\" aria-valuenow=\"100\" aria-label=\"Boiler\" aria-valuetext=\"100%, done Mon\"><span class=\"pgn\">Boiler</span><span class=\"pgv\">100%</span><span class=\"pgt\" style=\"--v:100\"><b></b></span><span class=\"pgs\">done Mon</span></div>"), "{h}");
    assert!(h.contains("<div class=\"pgr zero\" role=\"progressbar\" aria-valuemin=\"0\" aria-valuemax=\"100\" aria-valuenow=\"0\" aria-label=\"Lights\"><span class=\"pgn\">Lights</span><span class=\"pgv\">0%</span>"), "{h}");
    let one = site::fragment(
        &Built::new(serde_json::json!({"type": "steps", "id": "p", "bars": [{"label": "Fire", "value": 62}]})),
        "/act",
    );
    assert!(
        one.contains("<div class=\"pgl\"><div class=\"pgr\" role=\"progressbar\""),
        "{one}"
    );
    for empty in [
        serde_json::json!({"type": "steps", "id": "e", "steps": [], "fallback": {"title": "No steps yet"}}),
        serde_json::json!({"type": "steps", "id": "e", "bars": [], "fallback": {"title": "No steps yet"}}),
        serde_json::json!({"type": "steps", "id": "e", "steps": [{"id": "a", "label": "Stop"}], "fallback": {"title": "No steps yet"}}),
    ] {
        let h = site::fragment(&Built::new(empty), "/act");
        assert!(
            h.starts_with("<div class=\"b b-steps\" data-block=\"steps\" data-id=\"e\" data-fallback=\"\""),
            "{h}"
        );
        assert!(h.contains("No steps yet"), "{h}");
    }
}
