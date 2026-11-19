use blocks::expr::{Lit, State};
use blocks::tree::{expect, Drawn};
use blocks::Built;
use serde_json::json;

fn screen() -> Built {
    Built::new(json!({
        "type": "screen", "id": "home", "title": "Home",
        "blocks": [
            {"type": "text", "id": "hint", "markdown": "Ready", "show": {"get": "ready"}},
            {"type": "list", "id": "rows", "rows": [{"type": "row", "id": "r1", "title": "a", "style": "link"}]},
            {"type": "config", "id": "cfg", "rows": [{"type": "row", "id": "r2", "title": "b"}],
             "blocks": [{"type": "text", "id": "t", "markdown": "x"}]}
        ]
    }))
}

#[test]
fn expect_marks_native_fallback_and_hidden_blocks_in_drawn_order() {
    let kinds = ["screen", "text", "list", "row"];
    let ready = State::from([("ready".into(), Lit::Bool(true))]);
    let t = expect(&screen(), &kinds, &ready);
    assert_eq!(t.drawn, Drawn::Native);
    let ids: Vec<_> = t.children.iter().map(|c| (c.id.clone().unwrap(), c.drawn)).collect();
    assert_eq!(
        ids,
        [
            ("hint".into(), Drawn::Native),
            ("rows".into(), Drawn::Native),
            ("cfg".into(), Drawn::Fallback)
        ]
    );
    assert_eq!(t.children[1].children[0].variant.as_deref(), Some("link"));
    let cfg: Vec<_> = t.children[2].children.iter().map(|c| c.kind.as_str()).collect();
    assert_eq!(cfg, ["text"], "a fallback draws its blocks, not its rows");
    assert!(t.children.iter().all(|c| c.rect.is_none() && c.text.is_none()));
    let off = expect(&screen(), &kinds, &State::new());
    assert_eq!(off.children[0].drawn, Drawn::Hidden);
}
