use blocks::site;
use blocks::Built;

#[test]
fn a_message_draws_its_time_in_the_head_omits_it_unset_and_a_repeat_speaker_hides_the_head() {
    let said = |id: &str, name: &str, time: Option<&str>| {
        let mut m = serde_json::json!({"type": "message", "id": id, "role": "agent", "name": name, "blocks": []});
        if let Some(t) = time {
            m["time"] = t.into();
        }
        m
    };
    let b = serde_json::json!({"type": "section", "id": "s", "blocks": [
        said("a", "Scout", Some("14:32")),
        said("b", "Scout", Some("14:33")),
        said("c", "Mira", None),
    ]});
    let html = site::fragment(&Built::new(b), "/act");
    let head = r#"<div class="mh"><span class="mn b-message__name">Scout</span><span class="mr">agent</span><time class="mt">14:32</time></div>"#;
    assert!(html.contains(head), "{html}");
    let second = html.split(r#"data-id="b""#).next().unwrap_or_default();
    assert!(
        second.ends_with(r#"<article class="msg cont b b-message" data-block="message" "#),
        "{html}"
    );
    let third = html.split(r#"data-id="c""#).nth(1).unwrap_or_default();
    assert!(
        third.contains(r#"<span class="mr">agent</span></div>"#) && !third.contains("<time"),
        "{html}"
    );
}
