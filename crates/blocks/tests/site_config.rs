use blocks::site;
use blocks::Built;

#[test]
fn a_config_writes_each_field_as_a_settings_row_with_its_note_and_a_save_bar() {
    let b = serde_json::json!({
        "type": "config", "id": "edgar",
        "submit": { "action": "store", "label": "save", "off": true },
        "fields": [
            { "type": "text", "name": "agent", "value": "cooee", "doc": "sent to SEC" },
            { "type": "text", "name": "base", "value": "https://x.test", "keyboard": "url", "was": "https://www.sec.gov" },
            { "type": "text", "name": "every", "value": 4.5, "keyboard": "number", "error": "must be under 4", "doc": "minutes" },
            { "type": "toggle", "name": "on", "value": true },
            { "type": "secret", "name": "key", "set": true, "value": "hidden" },
            { "type": "secret", "name": "pin", "open": true }
        ]
    });
    let html = site::fragment(&Built::new(b), "/act");
    for part in [
        r#"<div class="form cfg as-surface b b-config" data-block="config" data-id="edgar" role="form" aria-label="edgar">"#,
        r#"<label class="fd"><span class="fl"><span class="fk">agent</span><span class="fn">sent to SEC</span></span><input name="agent" form="b-f1" type="text" autocomplete="off" placeholder="" value="cooee"></label>"#,
        r#"<span class="fn was">was https://www.sec.gov</span></span><input name="base" form="b-f1" type="url" autocomplete="off" inputmode="url""#,
        r#"<label class="fd err"><span class="fl"><span class="fk">every</span><span class="fn err">must be under 4</span></span><input name="every" form="b-f1" aria-invalid="true" type="text" autocomplete="off" inputmode="decimal" placeholder="" value="4.5">"#,
        r#"<label class="fd tg"><span class="fl"><span class="fk">on</span><span class="fn"></span></span><input name="on" form="b-f1" type="checkbox" role="switch" checked="">"#,
        r#"<input name="key" form="b-f1" type="password" autocomplete="off" placeholder="set ✓ · type to replace"></label>"#,
        r#"<label class="fd open"><span class="fl"><span class="fk">pin</span><span class="fn"></span></span><input name="pin" form="b-f1" autofocus="" type="password" autocomplete="off" placeholder="not set">"#,
        r#"<div class="bar"><button"#,
    ] {
        assert!(html.contains(part), "{part}\nnot in\n{html}");
    }
    assert!(!html.contains("value=\"hidden\""), "{html}");
    assert!(html.contains(" disabled=\"\""), "{html}");
}
