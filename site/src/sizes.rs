use blocks::expr::{Expr, Lit, State};
use blocks::layout::{self, Content, Contract, Node, Place};
use blocks::{Block, Button, List, Prose, Set, Stat, Tap, Tile, Tone};

use crate::ui::{b, heading, listing, marked, page, row, section, text, Page};

const LAYOUT: &str = include_str!("../layout.json");
const GARDEN: Contract = Contract {
    components: &[],
    locked: &["/screens/account"],
};
const GARDEN_RUST: &str = "const GARDEN: Contract = Contract {\n    components: &[],\n    locked: &[\"/screens/account\"],\n};\nlayout::check(LAYOUT_JSON, &GARDEN)?";

fn name(p: Place) -> String {
    serde_json::to_value(p)
        .ok()
        .and_then(|v| v.as_str().map(String::from))
        .unwrap_or_default()
}

fn screens<'a>(n: &'a Node, out: &mut Vec<&'a Node>) {
    if matches!(n.content, Content::Screen { .. }) {
        out.push(n);
    }
    n.slots.values().flatten().for_each(|c| screens(c, out));
}

fn tile(value: &str, unit: &str, label: &str) -> Tile {
    Tile {
        label: label.into(),
        value: blocks::Shown::Text(value.into()),
        unit: (!unit.is_empty()).then(|| unit.into()),
        ..Tile::default()
    }
}

fn rows(id: &str, items: &[(&str, &str, &str, bool)]) -> Block {
    let all: Vec<Block> = items
        .iter()
        .map(|(i, t, s, dry)| {
            if *dry {
                marked(i, t, s, "dry", Tone::Needs)
            } else {
                marked(i, t, s, "fine", Tone::Done)
            }
        })
        .collect();
    b!(List(List::new(all).id(id)))
}

fn content(id: &str) -> Vec<Block> {
    match id {
        "today" => vec![
            b!(Stat(Stat::new().id("t-figs").items(vec![
                tile("3", "", "to water"),
                tile("12", "", "plants"),
                tile("4", "mm", "rain tonight"),
            ]))),
            b!(List(
                List::new(vec![
                    b!(Row(row("j1", "Water the basil", "dry since Monday", "now"))),
                    b!(Row(row("j2", "Turn the lemon tree", "leaning to the window", "today"))),
                    b!(Row(row("j3", "Repot the fern", "roots out of the base", "Sat"))),
                ])
                .id("t-jobs")
            )),
        ],
        "plants" => vec![rows(
            "p-all",
            &[
                ("basil", "Basil", "kitchen sill", true),
                ("fern", "Fern", "bathroom", false),
                ("lemon", "Lemon tree", "living room", false),
                ("monstera", "Monstera", "hall", false),
                ("rosemary", "Rosemary", "balcony", true),
                ("mint", "Mint", "balcony", false),
            ],
        )],
        "weather" => vec![
            b!(Stat(Stat::new().id("w-rain").items(vec![tile(
                "4",
                "mm",
                "rain tonight, from 21:00"
            )]))),
            text("w-note", "Skip the balcony pots: the rain waters them."),
        ],
        _ => vec![text(&format!("{id}-note"), "Units, reminders and the garden's name.")],
    }
}

fn size_button(size: &str) -> Block {
    let is = Expr::Eq(Box::new([Expr::Get("size".into()), Expr::Lit(Lit::Str(size.into()))]));
    let set = Set {
        key: "size".into(),
        to: Expr::Lit(Lit::Str(size.into())),
    };
    b!(Button(
        Button::new(size)
            .id(format!("to-{size}"))
            .enabled(Expr::Not(Box::new(is)))
            .tap(Tap {
                set: Some(vec![set]),
                ..Tap::default()
            })
    ))
}

/// The Layout page: the site's `layout.json`, checked against its contract, drawn compact and wide.
pub fn layout() -> Result<Page, String> {
    let at = |b: &layout::Broken| format!("layout.json:{}:{} · {}", b.line, b.col, b.why);
    let lay = layout::check(LAYOUT, &GARDEN).map_err(|b| at(&b))?;
    let refused = match layout::check(&LAYOUT.replacen("\"strip\"", "\"tabs\"", 1), &GARDEN) {
        Err(b) => at(&b),
        Ok(_) => return Err("layout.json with an unknown place passed layout::check".into()),
    };
    let mut all = Vec::new();
    screens(&lay.root, &mut all);
    all.sort_by_key(|n| n.place.compact != Place::Strip);
    let label = |n: &Node| n.label.clone().unwrap_or_else(|| n.id.clone());
    let places = |n: &Node| (name(n.place.compact), name(n.place.wide));
    let drawn: Vec<Block> = all
        .iter()
        .map(|n| {
            let (c, w) = places(n);
            let id = &n.id;
            let tags = vec![
                text(&format!("at-compact-{c}-{id}"), &c),
                text(&format!("at-wide-{w}-{id}"), &w),
            ];
            section(id, &label(n), [tags, content(id)].concat())
        })
        .collect();
    let goes: Vec<Block> = all
        .iter()
        .map(|n| {
            let (c, w) = places(n);
            b!(Row(row(
                &format!("r-{}", n.id),
                &label(n),
                &format!("compact: {c} · wide: {w}"),
                ""
            )))
        })
        .collect();
    let open = Button::new("show layout.json")
        .id("open-file")
        .enabled(Expr::Not(Box::new(Expr::Get("file".into()))))
        .tap(Tap {
            set: Some(vec![Set {
                key: "file".into(),
                to: Expr::Lit(Lit::Bool(true)),
            }]),
            ..Tap::default()
        });
    let file = Prose::new(vec![heading("layout.json"), listing("json", LAYOUT.trim_end())]).id("json");
    let contract = Prose::new(vec![listing("rust", GARDEN_RUST)]).id("contract-rust");
    let p = page(
        "layout",
        "layout.html",
        "Layout",
        "One layout.json, drawn for a phone and for a wide window.",
        vec![
            text(
                "intro",
                "One `layout.json` places the same screens for a phone and for a wide window. Flip the size class: nothing is redrawn, the screens only move.",
            ),
            section(
                "switch",
                "Size class",
                vec![
                    size_button("compact"),
                    size_button("wide"),
                    text("passes", "passes `layout::check` against the site's contract"),
                ],
            ),
            section(
                "lay",
                "",
                vec![
                    section(
                        "left",
                        "",
                        vec![
                            section("drawn", "Drawn", vec![section("app", "", drawn)]),
                            section("where", "Where each screen goes", vec![b!(List(List::new(goes).id("goes")))]),
                        ],
                    ),
                    section("file", "", vec![b!(Button(open)), b!(Prose(file))]),
                ],
            ),
            section(
                "contract",
                "Checked when the site builds",
                vec![
                    text(
                        "c-why",
                        "The site declares its own contract: no components beyond `nav`, and one screen no file may place. A file that breaks a rule stops the build, with its line and column.",
                    ),
                    b!(Prose(contract)),
                    text("refused", &format!("**refused** {refused}")),
                ],
            ),
        ],
    );
    let state: State = [
        ("size".to_string(), Lit::Str(String::new())),
        ("file".to_string(), Lit::Bool(false)),
    ]
    .into_iter()
    .collect();
    Ok(Page {
        screen: p.screen.state(state),
        ..p
    })
}

/// The Layout page's CSS: its compact and wide rules apply on the pressed size, else on the window's width.
pub fn css() -> String {
    let all = include_str!("../sizes.css");
    let (common, rest) = all.split_once("/* compact */").unwrap_or((all, ""));
    let (compact, wide) = rest.split_once("/* wide */").unwrap_or((rest, ""));
    let on = |me: &str, other: &str, media: &str, body: &str| {
        format!(
            ".scr:has([data-id=to-{me}]:disabled){{{body}}}\n@media ({media}){{.scr:not(:has([data-id=to-{other}]:disabled)){{{body}}}}}\n"
        )
    };
    format!(
        "{common}{}{}",
        on("compact", "wide", "max-width:999px", compact),
        on("wide", "compact", "min-width:1000px", wide)
    )
}
