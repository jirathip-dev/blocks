use std::fs;
use std::path::Path;
use std::process::Command;

use serde_json::Value;

fn block<'a>(v: &'a Value, id: &str) -> Option<&'a Value> {
    if v.get("id").and_then(Value::as_str) == Some(id) {
        return Some(v);
    }
    match v {
        Value::Object(o) => o.values().find_map(|x| block(x, id)),
        Value::Array(a) => a.iter().find_map(|x| block(x, id)),
        _ => None,
    }
}

fn screen_of(html: &str) -> Value {
    let data = html.split("id=\"blocks-screen\"").nth(1).unwrap();
    serde_json::from_str(&data[data.find('>').unwrap() + 1..data.find("</script>").unwrap()]).unwrap()
}

#[test]
fn llms_txt_links_every_kind_to_its_markdown_twin_and_the_copy_button_carries_it() {
    let out = Path::new(env!("CARGO_TARGET_TMPDIR")).join("llms");
    assert!(Command::new(env!("CARGO_BIN_EXE_blocks-site"))
        .arg(&out)
        .status()
        .unwrap()
        .success());
    let llms = fs::read_to_string(out.join("llms.txt")).unwrap();
    assert!(llms.starts_with("# blocks\n\n> "));
    for want in [
        "skill/blocks/SKILL.md)",
        "docs/theme.md)",
        "docs/guard.md)",
        "skill/blocks/examples/ok-queue.md)",
    ] {
        assert!(llms.contains(want), "llms.txt: no {want}");
    }
    for k in blocks::Block::KINDS {
        let link = format!("- [{k}](https://jirathip-dev.github.io/blocks/kind-{k}.md): ");
        assert!(llms.contains(&link), "llms.txt: no entry for {k}");
        let md = fs::read_to_string(out.join(format!("kind-{k}.md"))).unwrap();
        assert!(md.starts_with(&format!("# `{k}`\n\n")), "kind-{k}.md");
        for part in [
            "\n## Rust\n\n",
            "```rust\n",
            "\n## JSON\n\n```json\n",
            "\n## Fields\n\n| field | type | |\n",
        ] {
            assert!(md.contains(part), "kind-{k}.md: no {part:?}");
        }
        let html = fs::read_to_string(out.join(format!("kind-{k}.html"))).unwrap();
        let screen = screen_of(&html);
        let copy = block(&screen, "copy-page").unwrap();
        assert_eq!(copy["label"], "Copy page", "kind-{k}");
        assert_eq!(
            copy["tap"]["copy"].as_str(),
            Some(md.as_str()),
            "kind-{k}: the button copies other text"
        );
        assert!(html.contains("data-copy=\""), "kind-{k}: the static button has no copy");
    }
}
