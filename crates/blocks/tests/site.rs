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
