use blocks::site;
use blocks::Built;

#[test]
fn editor_numbers_lines_from_first_and_marks_errors_on_and_off_the_excerpt() {
    let b = serde_json::json!({
        "type": "editor", "id": "src", "name": "main", "action": "check", "first": 40,
        "text": "fn main() {\n    let n = 1\n\n}",
        "errors": [{"line": 41, "message": "expected `;`"}, {"line": 41, "message": "second"}, {"line": 9, "message": "unknown <key>"}]
    });
    assert_eq!(
        site::fragment(&Built::new(b), "/act"),
        concat!(
            r#"<div class="ed b b-editor" data-block="editor" data-id="src" tabindex="0" role="button" aria-label="main">"#,
            r#"<div class="edl"><i>40</i><span>fn main() {</span></div>"#,
            r#"<div class="edl err"><i>41</i><span>    let n = 1</span></div><p class="ede">expected `;`</p>"#,
            r#"<div class="edl"><i>42</i><span> </span></div>"#,
            r#"<div class="edl"><i>43</i><span>}</span></div>"#,
            r#"<p class="ede far">line 9 · unknown &#60;key&#62;</p></div>"#,
        )
    );
}
