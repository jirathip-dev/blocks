use blocks::theme::{Hex, Mode, Scheme, Tokens};
use blocks::{Act, Block, ButtonStyle, ChipOption, Chips, Hero, List, Media, Prose, Shown, Stat, Tile, Tone};
use serde_json::Value;

use crate::ui::{
    b, bold, code, heading, link_row, listing, marked, open, page, para, section, span, text, url, Page, REPO,
};

const PAPER: [&str; 19] = [
    "#f3eee4",
    "#fcfaf5",
    "#d3c9b6",
    "#e5ddce",
    "#2a22144d",
    "#1f1c17",
    "#5a5347",
    "#24406b",
    "#24406b",
    "#547850",
    "#8a6a2f",
    "#9f5049",
    "#74678e",
    "#3c797d",
    "#24406b",
    "#64597c",
    "#31666a",
    "#456642",
    "#775d2c",
];

/// Paper: the site's own light scheme, to show that an app brings its own.
pub fn paper() -> Result<Scheme, String> {
    let [bg, card, edge, rule, scrim, fg, mute, l, link, g, a, r, p, c, fk_l, fk_p, fk_c, fk_g, fk_a] =
        PAPER.map(|h| Hex::try_from(h.to_string()));
    Ok(Scheme {
        label: "Paper".into(),
        mode: Mode::Light,
        tokens: Tokens {
            bg: bg?,
            card: card?,
            edge: edge?,
            line: rule?,
            scrim: scrim?,
            fg: fg?,
            mute: mute?,
            l: l?,
            link: link?,
            g: g?,
            a: a?,
            r: r?,
            p: p?,
            c: c?,
            fk_l: fk_l?,
            fk_p: fk_p?,
            fk_c: fk_c?,
            fk_g: fk_g?,
            fk_a: fk_a?,
        },
    })
}

fn tile(value: &str, unit: &str, label: &str) -> Tile {
    Tile {
        label: label.into(),
        value: Shown::Text(value.into()),
        unit: (!unit.is_empty()).then(|| unit.into()),
        tone: None,
        spark: None,
    }
}

fn stats(id: &str, items: Vec<Tile>) -> Block {
    b!(Stat(Stat::new().id(id).items(items)))
}

fn script_kb(bench: Option<&Value>) -> Option<String> {
    let n = bench?.pointer("/results/script_gzip_bytes/median")?.as_f64()?;
    Some(format!("{:.1}", n / 1024.0))
}

pub fn home(kinds: usize, bench: Option<&Value>) -> Page {
    let tiles = Media::new(
        "media/tiles.svg",
        "tiles of a screen settling into place",
        640_u32,
        400_u32,
    )
    .caption("This page is one too.");
    let act = |label: &str, tap| Act {
        label: label.into(),
        tap: Some(tap),
        ..Act::default()
    };
    let hero = Hero::new("blocks")
        .id("hero")
        .subtitle("Typed screens, drawn the same on the web, in SwiftUI and as a static page.")
        .media(tiles)
        .actions(vec![
            act("see the kinds", open("gallery.html")),
            act("github", url(REPO)),
            act("docs", url(&format!("{REPO}#readme"))),
        ]);
    let mut facts = vec![
        tile(&kinds.to_string(), "", "core kinds"),
        tile("3", "", "renderers: web, SwiftUI, static"),
    ];
    facts.extend(script_kb(bench).map(|kb| tile(&kb, "KB", "of script, gzipped")));
    facts.push(tile("0", "", "lines of hand-written HTML here"));
    let what = Prose::new(vec![
        heading("One shape for a screen"),
        para(vec![
            span("An app builds a "),
            bold("Screen"),
            span(" from typed blocks: rows, stats, forms, prose. A server sends it once, then only what changed. Each renderer draws the same tree, and every block carries a fallback, so a renderer that lacks a kind still shows something true."),
        ]),
        para(vec![
            span("With JS off, a page is plain HTML: every link works and every word reads. With "),
            code("blocks.js"),
            span(", the page is adopted where it stands, with no redraw."),
        ]),
    ])
    .id("what");
    let rust = Prose::new(vec![
        heading("This page, in Rust"),
        listing(
            "rust",
            "Screen::new().id(\"home\").title(\"blocks\").blocks(vec![\n  Block::Nav(Box::new(nav)),\n  Block::Hero(Box::new(Hero::new(\"blocks\")\n    .subtitle(\"Typed screens, drawn the same…\")\n    .actions(acts))),\n  Block::Stat(Box::new(Stat::new().items(facts))),\n])",
        ),
    ])
    .id("code");
    let tour = vec![
        link_row(
            "to-gallery",
            "Gallery",
            "every core kind, drawn from its sample; the ones with no HTML view show their fallback",
            &format!("{kinds} kinds"),
            "gallery.html",
        ),
        link_row(
            "to-schemes",
            "Schemes",
            "the default pair, light and dark, and a scheme this site brings itself",
            "3",
            "schemes.html",
        ),
        link_row(
            "to-numbers",
            "Numbers",
            "first paint, update cost and script size, against the budgets CI holds",
            "",
            "numbers.html",
        ),
    ];
    page(
        "home",
        "index.html",
        "blocks",
        "Typed screens, drawn the same on the web, in SwiftUI and as a static page.",
        vec![
            b!(Hero(hero)),
            stats("facts", facts),
            section("pair-what", "", vec![b!(Prose(what)), b!(Prose(rust))]),
            section("tour", "Look around", vec![b!(List(List::new(tour).id("pages")))]),
        ],
    )
}

pub const SWATCHES: [&str; 10] = [
    "--bg", "--card", "--edge", "--fg", "--mute", "--l", "--g", "--a", "--r", "--c",
];

fn panel(id: &str, label: &str) -> Block {
    let chip = |v: &str| ChipOption {
        value: v.into(),
        label: v.into(),
    };
    let swatches = Chips::new(format!("sw-{id}"), SWATCHES.map(chip).to_vec()).id(format!("sw-{id}"));
    let picks = Chips::new(format!("pick-{id}"), vec![chip("low"), chip("high")])
        .id(format!("pick-{id}"))
        .selected(vec!["low".to_string()]);
    let rows = vec![
        marked(
            &format!("{id}-build"),
            "Build",
            "green, 2 minutes ago",
            "2m",
            Tone::Done,
        ),
        marked(&format!("{id}-deploy"), "Deploy", "waiting on review", "", Tone::Needs),
        marked(&format!("{id}-lint"), "Lint", "3 warnings", "", Tone::Fail),
    ];
    let button = |name: &str, style: ButtonStyle| {
        b!(Button(
            blocks::Button::new(name).id(format!("{id}-{name}")).style(style)
        ))
    };
    section(
        &format!("s-{id}"),
        label,
        vec![
            b!(Chips(swatches)),
            b!(List(List::new(rows).id(format!("{id}-rows")))),
            stats(
                &format!("{id}-figures"),
                vec![tile("3", "", "open"), tile("12", "ms", "p50")],
            ),
            b!(Chips(picks)),
            button("save", ButtonStyle::Primary),
            button("delete", ButtonStyle::Destructive),
        ],
    )
}

pub fn schemes(paper: &Scheme) -> Page {
    let look = blocks::Button::new("look").id("look").tap(blocks::Tap {
        sheet: Some("look".into()),
        ..blocks::Tap::default()
    });
    let json = serde_json::to_string_pretty(paper).unwrap_or_default();
    let own = Prose::new(vec![
        heading("Bring your own"),
        para(vec![
            span("A scheme is the 19 colour tokens and a label. The site hands it to the page with the default pair; the look sheet lists what it is given. "),
            code("theme::gate"),
            span(" checks contrast and colour distance before a scheme ships, and this site's build runs it on Paper."),
        ]),
    ])
    .id("own");
    page(
        "schemes",
        "schemes.html",
        "Schemes",
        "The built-in default pair, light and dark, and a scheme this site brings itself.",
        vec![
            text(
                "intro",
                "blocks ships one scheme: the default pair, light and dark. An app brings any other itself. With JS off you see all three below; with `blocks.js`, the **look** button opens the shell's look sheet and the whole site changes.",
            ),
            b!(Button(look)),
            section(
                "panels",
                "",
                vec![
                    panel("light", "Default light · built in"),
                    panel("dark", "Default dark · built in"),
                    panel("paper", "Paper · this site's own"),
                ],
            ),
            section(
                "pair-own",
                "",
                vec![
                    b!(Prose(own)),
                    b!(Prose(Prose::new(vec![heading("Paper's JSON"), listing("json", &json)]).id("paper-json"))),
                ],
            ),
        ],
    )
}

const BUDGETS: [(&str, &str, &str); 6] = [
    ("150", "µs", "diff a 200-row screen"),
    ("150", "µs", "apply its ops"),
    ("3", "ms", "serialize a 500 KB screen"),
    ("5", "ms", "parse a 500 KB screen"),
    ("10", "ms", "write a 500 KB screen as HTML"),
    ("300", "µs", "check a 200-node layout"),
];

fn measured(bench: &Value) -> Option<Vec<Block>> {
    let r = bench.get("results")?;
    let stat = |k: &str| -> Option<(f64, f64, f64)> {
        let s = r.get(k)?;
        Some((
            s.get("median")?.as_f64()?,
            s.get("min")?.as_f64()?,
            s.get("max")?.as_f64()?,
        ))
    };
    let ms = |k: &str, label: &str| -> Option<Tile> {
        let (m, lo, hi) = stat(&format!("{k}_ms"))?;
        let sent = stat(&format!("{k}_bytes")).map_or(String::new(), |(b, _, _)| format!(" · {b:.0} B sent"));
        Some(tile(&format!("{m}"), "ms", &format!("{label} · {lo}–{hi} ms{sent}")))
    };
    let m = bench.get("machine")?;
    let s = |v: &Value, k: &str| {
        v.get(k)
            .map(|x| x.as_str().map_or_else(|| x.to_string(), String::from))
            .unwrap_or_default()
    };
    let webkit = bench
        .pointer("/versions/webkit")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let intro = format!(
        "Measured by `just bench` in headless WebKit on a 200-row screen: the median of {} runs, min–max beside it. {}, {} cores, WebKit {}, {}.",
        s(bench, "runs"),
        s(m, "cpu"),
        s(m, "cores"),
        webkit,
        s(bench, "date")
    );
    let (mem, lo, hi) = stat("memory_after_updates_mb")?;
    let updates = s(bench, "updates_for_memory");
    Some(vec![
        text("intro", &intro),
        section(
            "paint",
            "First paint, 200 rows",
            vec![stats(
                "paint-figures",
                vec![ms("first_paint_cold", "cold")?, ms("first_paint_warm", "warm")?],
            )],
        ),
        section(
            "update",
            "One update, to the screen",
            vec![stats(
                "update-figures",
                vec![
                    ms("update_one", "one row changed")?,
                    ms("update_insert", "one row inserted")?,
                    ms("update_twenty", "20 rows changed")?,
                ],
            )],
        ),
        section(
            "weight",
            "Weight",
            vec![stats(
                "weight-figures",
                vec![
                    tile(&script_kb(Some(bench))?, "KB", "script, gzipped: blocks.js, level 9"),
                    tile(
                        &format!("{mem:.0}"),
                        "MB",
                        &format!(
                            "browser process memory (WebContent RSS) after {updates} updates · {lo:.0}–{hi:.0} MB"
                        ),
                    ),
                ],
            )],
        ),
    ])
}

pub fn numbers(bench: Option<&Value>) -> Page {
    let mut body = bench.and_then(measured).unwrap_or_else(|| {
        vec![text(
            "intro",
            "The browser bench has not run yet: `just bench` writes its numbers. Until then, the budgets alone.",
        )]
    });
    let budgets = BUDGETS
        .iter()
        .map(|(v, u, l)| tile(&format!("≤ {v}"), u, &format!("{l} · budget")))
        .collect();
    body.push(section(
        "budgets",
        "Budgets CI holds · just perf, release",
        vec![
            text(
                "budget-note",
                "CI fails a change that takes longer than these. Measured times join them in a later change.",
            ),
            stats("budget-figures", budgets),
        ],
    ));
    page(
        "numbers",
        "numbers.html",
        "Numbers",
        "blocks' own measurements, and the budgets CI holds it to.",
        body,
    )
}
