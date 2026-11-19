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
        css: &["/blocks.css", "/app.css"],
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
        "<meta name=\"twitter:card\" content=\"summary_large_image\">",
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
fn a_page_links_only_the_stylesheets_it_is_given_and_a_sheet_tap_names_its_sheet() {
    let look = look();
    let tap = blocks::Tap {
        sheet: Some("look".into()),
        ..blocks::Tap::default()
    };
    let screen = Built::of(
        &Screen::new()
            .id("s")
            .blocks(vec![Block::Button(Box::new(Button::new("look").id("look").tap(tap)))]),
    );
    let dark = &theme::default().dark;
    let site = Site {
        head: Head {
            title: "t",
            description: "d",
            canonical: "https://example.org/blocks/",
            image: None,
            lang: "en",
        },
        look: &look,
        css: &["blocks.css"],
        action: "",
        live: Some(Live {
            js: "blocks.js",
            stream: "",
            looks: &[("dark", dark)],
        }),
    };
    let p = site::page(&screen, &site);
    assert!(p.contains("<link rel=\"stylesheet\" href=\"blocks.css\">"), "{p}");
    assert!(!p.contains("href=\"/"), "{p}");
    assert!(p.contains("<meta name=\"twitter:card\" content=\"summary\">"));
    assert!(
        p.contains("data-id=\"look\" type=\"button\" data-sheet=\"look\""),
        "{p}"
    );
    let looks = p
        .split("data-looks=\"")
        .nth(1)
        .and_then(|s| s.split('"').next())
        .unwrap();
    let looks: serde_json::Value = serde_json::from_str(&looks.replace("&#34;", "\"")).unwrap();
    assert_eq!(looks["dark"], serde_json::to_value(dark).unwrap());
}

#[test]
fn a_live_page_carries_the_screen_and_the_module_and_nothing_else() {
    let p = page(Some(Live {
        js: "/blocks.js",
        stream: "/stream",
        looks: &[],
    }));
    assert_eq!(p.matches("<script").count(), 2);
    assert!(p.contains("<script type=\"module\" src=\"/blocks.js\"></script>"));
    let json = p
        .split("id=\"blocks-screen\" data-stream=\"/stream\" data-action=\"/act\" data-looks=\"{}\">")
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
    assert!(p.contains("<button class=\"b b-button\" data-block=\"button\" data-id=\"go\" type=\"submit\" form=\"b-f1\" data-action=\"go\" role=\"button\" aria-label=\"Go\"><span>Go</span></button>"), "{p}");
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
        r#"<div class="form cfg b b-config" data-block="config" data-id="edgar" role="form" aria-label="edgar">"#,
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
        h.starts_with("<div class=\"scn b b-scene\" data-block=\"scene\" data-id=\"s\" role=\"group\" aria-label=\"s\"><ul class=\"scl\">"),
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
            "<div class=\"ln needs tap\" data-id=\"c\" aria-label=\"act, needs\" role=\"button\" tabindex=\"0\" data-action=\"go\">"
        ),
        "{h}"
    );
    assert!(h.contains("<span class=\"lnx\">claude</span>"), "{h}");
    assert!(h.contains("<div class=\"ln idle\" data-id=\"d\" aria-label=\"plain, idle\"><i class=\"lnm\"></i><span class=\"lnb\"><span class=\"lnh\"><span class=\"lnt\">plain</span><span class=\"lns\">idle</span></span></span></div>"), "{h}");
}

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
    assert!(open.starts_with("<div class=\"rr open b b-row\" data-block=\"row\" data-id=\"i\" role=\"group\" aria-label=\"#23\"><div class=\"row tap\" data-id=\"i\" tabindex=\"0\" role=\"button\" aria-expanded=\"true\"><span class=\"rm\"><span class=\"rt b-row__title\">#23</span></span><span class=\"rc\">›</span></div><ol class=\"rds\">"), "{open}");
    assert!(open.contains("<li class=\"rd done\"><i class=\"rdm\" aria-label=\"done\"></i><div class=\"rdx\"><div class=\"rdl tap\" tabindex=\"0\" role=\"button\" data-action=\"see\"><span class=\"rdn\">impl</span><span class=\"rdu\"></span><span class=\"rdt\"><span data-tick=\"{&#34;since&#34;:&#34;2026-11-19T12:00:00Z&#34;}\"></span></span><span class=\"rc\">›</span></div></div></li>"), "{open}");
    assert!(open.contains("<li class=\"rd needs now\"><i class=\"rdm\" aria-label=\"needs\"></i><div class=\"rdx\"><div class=\"rdl\"><span class=\"rdn\">rev</span><span class=\"rdu\">busy</span></div><div class=\"rdb\"><div class=\"rdh\">rev-1 · mini</div><div class=\"rdo\"><div>a</div><div>b</div></div><div class=\"rdk\"><button type=\"submit\" form=\"b-f1\" data-action=\"go\"><span>go</span></button></div></div></div></li></ol></div>"), "{open}");
    let live = site::fragment(&row("working"), "/act");
    assert!(live.starts_with("<div class=\"rr b b-row\" data-block=\"row\" data-id=\"i\" role=\"group\" aria-label=\"#23\"><div class=\"row tap\" data-id=\"i\" tabindex=\"0\" role=\"button\" aria-expanded=\"false\"><span class=\"rm\"><span class=\"rt b-row__title\">#23</span><span class=\"rs b-row__subtitle \">review</span></span><span class=\"rc\">›</span></div></div>"), "{live}");
}

#[test]
fn a_web_block_whose_src_is_not_http_or_https_writes_a_muted_box_with_no_frame_or_link() {
    for src in [
        "javascript:alert(1)",
        "java\tscript:alert(1)",
        "java\nscript:alert(1)",
        " \u{1}JavaScript:alert(1)",
        "data:text/html,x",
    ] {
        let b = Built::new(serde_json::json!({"type": "web", "id": "w", "src": src, "height": 120}));
        let h = site::fragment(&b, "/act");
        assert!(!h.contains("<iframe") && !h.contains("<a "), "{src:?}: {h}");
        assert!(
            h.contains("<div class=\"wf none\" style=\"height:120px\">This page can&#39;t be shown here.</div>"),
            "{src:?}: {h}"
        );
    }
    let b = Built::new(serde_json::json!({"type": "web", "id": "w", "src": "/doc", "height": 9}));
    assert!(site::fragment(&b, "/act").contains("<iframe"));
}

#[test]
fn an_island_is_its_element_with_its_props_and_fallback_and_a_bad_name_a_plain_fallback() {
    let island = |name: &str| {
        let b = serde_json::json!({"type": "island", "id": "m", "name": name, "props": {"q": "<a&b>"}, "fallback": {"title": "The map"}});
        site::fragment(&Built::new(b), "/act")
    };
    assert_eq!(
        island("x-map"),
        "<x-map class=\"b b-island\" data-block=\"island\" data-id=\"m\" data-fallback=\"\" data-props=\"{&#34;q&#34;:&#34;&#60;a&#38;b&#62;&#34;}\" role=\"group\" aria-label=\"x-map\"><div class=\"row\" data-id=\"\"><span class=\"rm\"><span class=\"rt b-row__title\">The map</span></span></div></x-map>"
    );
    for bad in ["x map", "map", "X-map", "x-<b>", "1-x"] {
        let h = island(bad);
        assert!(h.starts_with("<div class=\"b b-island\""), "{bad:?}: {h}");
        assert!(h.ends_with("</div></div>") && h.contains("The map"), "{bad:?}: {h}");
    }
}

fn chart(v: serde_json::Value) -> String {
    site::fragment(&Built::new(v), "/act")
}

#[test]
fn a_chart_writes_its_format_months_era_and_axis_and_posts_a_tapped_month_with_no_js() {
    let combo = chart(serde_json::json!({
        "type": "chart", "id": "rev", "title": "Revenue", "chart": "combo", "x": ["2024-02", "2024-03"],
        "era": "be", "format": "thb_m", "selected": "2024-03", "tap": {"action": "sales.month"},
        "series": [{"name": "Revenue", "values": [845_000, 12_345_678]}, {"name": "Target", "as": "line", "values": [1, 2]}]
    }));
    for want in [
        ">Mar 2567<",
        ">Feb 67<",
        "<b>฿12.3M</b>",
        "Feb 2567: Revenue ฿845K, Target ฿1",
        "aria-pressed=\"true\"",
        ">฿0</span>",
        "name=\"_action\" value=\"sales.month\"",
        "name=\"x\" value=\"2024-03\"",
        "class=\"chk chkl\"",
    ] {
        assert!(combo.contains(want), "{want} in {combo}");
    }
    let line = chart(serde_json::json!({
        "type": "chart", "title": "Margin", "chart": "line", "x": ["2023-10", "2023-11"], "lang": "th", "format": "percent",
        "series": [{"name": "FY", "values": [28.14, 33.5]}, {"name": "Last", "tone": "mute", "dash": true, "values": [30, 31]}]
    }));
    for want in [
        ">25%</span>",
        ">30%</span>",
        ">35%</span>",
        ">ต.ค. 2023<",
        "<b>33.5%</b>",
        "class=\"s dash\"",
        "var(--mute)",
        ">ตาราง<",
    ] {
        assert!(line.contains(want), "{want} in {line}");
    }
    assert!(!line.contains(">0%</span>"), "a line chart fits its axis to the data");
    let empty = chart(
        serde_json::json!({"type": "chart", "title": "Orders", "chart": "bar", "x": [], "series": [], "empty": "None yet"}),
    );
    assert!(empty.contains(">None yet<") && !empty.contains("chc"), "{empty}");
}

#[test]
fn a_donut_folds_all_but_its_four_biggest_slices_into_other_and_reads_a_picked_one() {
    let x = ["Payroll", "Stock", "Rent", "Ads", "Delivery", "Software", "Power"];
    let d = chart(serde_json::json!({
        "type": "chart", "title": "Spend", "chart": "donut", "x": x, "format": "thb", "selected": "Stock",
        "series": [{"name": "Spend", "values": [3_820_000, 2_950_000, 1_200_000, 640_000, 410_000, 180_000, 150_000]}]
    }));
    for want in [
        ">Other (3)<",
        ">฿740,000<",
        "class=\"chr sel\"",
        "<b>฿2,950,000</b><span>Stock</span>",
        "Payroll: ฿3,820,000, 41%",
    ] {
        assert!(d.contains(want), "{want} in {d}");
    }
    assert!(!d.contains(">Delivery<"), "a folded slice is in Other");
}

fn invoice(qty: &str) -> serde_json::Value {
    serde_json::json!({
        "type": "lines", "id": "inv", "name": "items", "label": "invoice lines", "add": "add item",
        "columns": [
            {"type": "text", "name": "qty", "label": "Qty", "keyboard": "number"},
            {"type": "text", "name": "price", "label": "Price", "keyboard": "number"},
            {"type": "text", "name": "amount", "label": "Amount", "keyboard": "number"},
            {"type": "text", "name": "paid", "label": "Paid", "keyboard": "number"}
        ],
        "calc": {"amount": {"mul": [{"get": "qty"}, {"get": "price"}]}},
        "sum": ["amount", "paid"], "balance": ["amount", "paid"],
        "items": [
            {"id": "a", "values": {"qty": qty, "price": "1,450.005", "paid": "2900.01"}},
            {"id": "b", "values": {"qty": "x", "price": "3", "paid": "0"}}
        ],
        "submit": {"label": "save", "action": "save-invoice"}
    })
}

#[test]
fn lines_work_out_calc_cells_and_totals_in_minor_units_and_check_the_balance() {
    let html = site::fragment(&Built::new(invoice("2")), "/act");
    assert!(
        html.contains(r#"<span class="lqv" data-row="a" data-cell="amount">2,900.01</span>"#),
        "{html}"
    );
    assert!(
        html.contains(r#"<span class="lqv" data-row="b" data-cell="amount">—</span>"#),
        "{html}"
    );
    assert!(html.contains("<b>2,900.01</b>"), "{html}");
    assert!(
        html.contains(r#"<p class="lqb ok" role="status">balanced · amount = paid</p>"#),
        "{html}"
    );
    assert!(
        html.contains(r#"value="1,450.005""#),
        "a field keeps what was typed: {html}"
    );
    assert!(
        !html.contains("lqw") && html.contains(r#"<button type="submit" form="b-f1" data-action="save-invoice">"#),
        "{html}"
    );
    let off = site::fragment(&Built::new(invoice("3")), "/act");
    assert!(off.contains("out of balance · paid short by 1,450.01"), "{off}");
    assert!(
        off.contains(r#"<p class="m lqw">balance the entry to save</p>"#),
        "{off}"
    );
    assert!(
        off.contains(r#"<button disabled="" type="submit" form="b-f1" data-action="save-invoice">"#),
        "{off}"
    );
}

#[test]
fn lines_mark_a_row_error_and_turn_remove_off_at_the_minimum() {
    let mut b = invoice("2");
    b["min"] = 2.into();
    b["errors"] =
        serde_json::json!([{"row": "b", "name": "qty", "message": "a number"}, {"row": "gone", "message": "old"}]);
    let html = site::fragment(&Built::new(b), "/act");
    assert!(
        html.contains(r#"<div class="lqr err" role="group" aria-label="line 2">"#),
        "{html}"
    );
    assert!(html.contains(r#"<label class="lqc num err"><span class="lqk">Qty</span><input name="items.1.qty" aria-label="Qty, line 2""#), "{html}");
    assert!(
        html.contains(r#"<p class="lqe">a number</p>"#) && !html.contains(">old<"),
        "{html}"
    );
    assert!(html.contains(r#"<p class="m lqw">fix 1 line to save</p>"#), "{html}");
    assert_eq!(
        html.matches(r#"aria-label="remove line 1" disabled"#).count(),
        1,
        "{html}"
    );
}

#[test]
fn a_lines_block_gets_a_fallback_named_by_its_label() {
    let lines = blocks::samples().into_iter().find(|(k, _)| *k == "lines").unwrap().1;
    let v = Built::of(&Screen::new().id("s").blocks(vec![lines])).value().clone();
    assert_eq!(v["blocks"][0]["fallback"]["title"], "journal lines");
}

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

#[test]
fn a_link_that_is_not_http_https_mailto_or_relative_is_dropped_and_its_text_drawn() {
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let text = std::fs::read_to_string(root.join("fixtures/links/screen.json")).unwrap();
    let f: serde_json::Value = serde_json::from_str(&text).unwrap();
    let html = site::fragment(&Built::new(f["screen"].clone()), "/act");
    let low = html.to_ascii_lowercase();
    for bad in ["javascript:", "href=\"data:", "href=\" "] {
        assert!(!low.contains(bad), "{bad} in {html}");
    }
    for want in f["texts"].as_array().unwrap() {
        assert!(html.contains(want.as_str().unwrap()), "{want} not in {html}");
    }
    for good in ["https://example.org/a", "mailto:ops@example.org", "/docs", "/about"] {
        assert!(
            html.contains(&format!("href=\"{good}\"")),
            "{good} not linked in {html}"
        );
    }
}
