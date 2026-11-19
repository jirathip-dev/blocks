use blocks::site::{self, Head, Live, Look, Site};
use blocks::theme::{self, Style};
use blocks::{Action, Block, Built, Button, Row, Screen};

fn look() -> Look {
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let text = std::fs::read_to_string(root.join("fixtures/styles/still.json")).unwrap();
    let style: Style = serde_json::from_str(&text).unwrap();
    Look {
        schemes: theme::default().clone(),
        style,
    }
}

fn screen() -> Built {
    let row = Row::new("<b>Tom & \"Jerry\"</b>").id("r");
    let go = Button::new("Go").id("go").action("go");
    Built::of(
        &Screen::new()
            .id("home")
            .title("Home")
            .blocks(vec![Block::Row(Box::new(row)), Block::Button(Box::new(go))]),
    )
}

fn page(live: Option<Live<'_>>) -> String {
    let look = look();
    let site = Site {
        head: Head {
            title: "Pricing <now>",
            description: "Plans",
            canonical: "https://example.org/pricing",
            image: Some("/og.png"),
            lang: "en",
        },
        look: &look,
        css: &["/app.css"],
        action: "/act",
        live,
    };
    site::page(&screen(), &site)
}

#[test]
fn a_page_has_its_head_escaped_text_and_no_script_without_live() {
    let p = page(None);
    for want in [
        "<html lang=\"en\">",
        "<title>Pricing &#60;now&#62;</title>",
        "<meta name=\"description\" content=\"Plans\">",
        "<link rel=\"canonical\" href=\"https://example.org/pricing\">",
        "<meta property=\"og:image\" content=\"/og.png\">",
        "<link rel=\"stylesheet\" href=\"/blocks.css\"><link rel=\"stylesheet\" href=\"/app.css\">",
        "@media (prefers-color-scheme: dark)",
        "&#60;b&#62;Tom &#38; &#34;Jerry&#34;&#60;/b&#62;",
    ] {
        assert!(p.contains(want), "{want} not in {p}");
    }
    assert!(!p.contains("<b>Tom"));
    assert!(!p.contains("<script"));
}

#[test]
fn a_live_page_carries_the_screen_and_the_module_and_nothing_else() {
    let p = page(Some(Live {
        js: "/blocks.js",
        stream: "/stream",
    }));
    assert_eq!(p.matches("<script").count(), 2);
    assert!(p.contains("<script type=\"module\" src=\"/blocks.js\"></script>"));
    let json = p
        .split("id=\"blocks-screen\" data-stream=\"/stream\" data-action=\"/act\">")
        .nth(1)
        .and_then(|s| s.split("</script>").next())
        .unwrap();
    assert!(!json.contains('<'), "{json}");
    let back: serde_json::Value = serde_json::from_str(json).unwrap();
    assert_eq!(&back, screen().value());
}

#[test]
fn an_action_is_a_submit_of_a_form_that_posts_its_values() {
    let p = page(None);
    assert!(p.contains("<button class=\"b b-button\" data-block=\"button\" data-id=\"go\" type=\"submit\" form=\"b-f1\"><span>Go</span></button>"), "{p}");
    assert!(p.contains("<form id=\"b-f1\" method=\"post\" action=\"/act\" hidden><input type=\"hidden\" name=\"_screen\" value=\"home\"><input type=\"hidden\" name=\"_block\" value=\"go\"><input type=\"hidden\" name=\"_action\" value=\"go\"></form>"), "{p}");
}

#[test]
fn from_form_reads_the_post_the_fixture_site_sends() {
    let a = Action::from_form("email=a%40b.test&_screen=site&_block=signup&_action=sign-up&note=two+words").unwrap();
    assert_eq!(a.screen, "site");
    assert_eq!(a.block.as_deref(), Some("signup"));
    assert_eq!(a.action, "sign-up");
    assert_eq!(a.values["email"], "a@b.test");
    assert_eq!(a.values["note"], "two words");
    assert_eq!(Action::from_form("_screen=s&_block=&_action=go").unwrap().block, None);
}

#[test]
fn from_form_refuses_a_post_with_no_action_or_a_bad_escape() {
    for bad in [
        "_screen=s",
        "_action=go",
        "_screen=s&_action=go&x=%zz",
        "_screen=s&_action=go&x=%ff",
    ] {
        assert!(Action::from_form(bad).is_err(), "{bad}");
    }
}

#[test]
fn a_diff_writes_its_summary_and_lines_its_header_alone_with_no_hunks_and_its_fallback_with_no_hunks_list() {
    let w = |v: serde_json::Value| site::fragment(&Built::new(v), "/act");
    let full = w(
        serde_json::json!({"type": "diff", "file": "a<b", "summary": "+1", "hunks": [{"at": "@@", "lines": [" c", "\\ x", ""]}]}),
    );
    assert!(full.contains("<span class=\"dfs\">+1</span></div><div class=\"dfb\"><div class=\"dfk\">@@</div><div class=\"dfl ctx\"><i class=\"dfm\"> </i>c</div><div class=\"dfl ctx\"><i class=\"dfm\">\\</i> x</div><div class=\"dfl ctx\"><i class=\"dfm\"> </i></div></div>"), "{full}");
    assert!(full.contains("aria-label=\"a&#60;b\""), "{full}");
    let bare = w(serde_json::json!({"type": "diff", "file": "gone.rs", "hunks": []}));
    assert!(
        bare.ends_with("<span class=\"dff\">gone.rs</span></div></div>"),
        "{bare}"
    );
    let odd = w(serde_json::json!({"type": "diff", "file": "a", "fallback": {"title": "Change"}}));
    assert!(
        odd.contains("data-fallback") && odd.contains("Change") && !odd.contains("dfh"),
        "{odd}"
    );
}

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
        r#"<div class="form cfg b b-config" data-block="config" data-id="edgar">"#,
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
        h.starts_with("<div class=\"scn b b-scene\" data-block=\"scene\" data-id=\"s\"><ul class=\"scl\">"),
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
            "<div class=\"ln needs tap\" data-id=\"c\" aria-label=\"act, needs\" role=\"button\" tabindex=\"0\">"
        ),
        "{h}"
    );
    assert!(h.contains("<span class=\"lnx\">claude</span>"), "{h}");
    assert!(h.contains("<div class=\"ln idle\" data-id=\"d\" aria-label=\"plain, idle\"><i class=\"lnm\"></i><span class=\"lnb\"><span class=\"lnh\"><span class=\"lnt\">plain</span><span class=\"lns\">idle</span></span></span></div>"), "{h}");
}
