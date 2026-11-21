use std::collections::BTreeMap;

use blocks::site::fragment;
use blocks::{
    Accept, Act, Bar, Block, Built, Button, ButtonStyle, Card, CardKind, ChipOption, Chips, Choice, ChoiceOption,
    Composer, ComposerChip, Diagram, Diff, Editor, Fallback, Field, FieldValue, Form, Hero, Hunk, Image, Images,
    Island, IslandSize, Label, Lane, LaneState, LineError, List, Mark, MarkKind, Media, Nav, NavLink, Node, Other,
    Pages, Part, PickerField, Prose, Queued, Row, Run, ScanField, Scene, Screen, Secret, SecretField, Sheet, Shown,
    Span, Stage, Stat, Steps, Submit, Tap, Text, TextField, Tile, ToggleField, Tone, UploadField, Web,
};
use serde_json::{Number, Value};

use crate::play;
use crate::ui::{b, bold, heading, link_row, listing, marked, open, page, para, row, section, span, text, Page};

const GROUPS: [(&str, &[&str]); 4] = [
    ("Layout", &["screen", "section", "sheet", "card"]),
    (
        "Words and pictures",
        &["text", "prose", "hero", "nav", "media", "images", "pages", "diagram"],
    ),
    (
        "Lists and figures",
        &["list", "row", "stat", "chart", "table", "steps", "chips", "timeline"],
    ),
    (
        "Input",
        &[
            "button", "choice", "form", "lines", "composer", "run", "toast", "import",
        ],
    ),
];

fn place(x: f64, y: f64) -> Vec<Number> {
    [x, y].into_iter().filter_map(Number::from_f64).collect()
}

fn markup() -> Vec<Mark> {
    let mark = |id: &str, kind: MarkKind, at: Vec<Number>| Mark {
        id: id.into(),
        kind,
        at,
        ..Mark::default()
    };
    vec![
        Mark {
            to: Some(place(0.86, 0.95)),
            tone: Some(Tone::Warn),
            ..mark("best", MarkKind::Highlight, place(0.72, 0.1))
        },
        Mark {
            to: Some(place(0.7, 0.3)),
            ..mark("why", MarkKind::Arrow, place(0.45, 0.2))
        },
        Mark {
            text: Some("Launch week".into()),
            ..mark("note", MarkKind::Text, place(0.2, 0.12))
        },
        Mark {
            text: Some("1".into()),
            tone: Some(Tone::Info),
            ..mark("dip", MarkKind::Pin, place(0.36, 0.72))
        },
    ]
}

fn about(kind: &str) -> &'static str {
    match kind {
        "screen" => "A whole screen: its title and its blocks.",
        "section" => "A titled group of blocks.",
        "sheet" => "A sheet over a screen.",
        "card" => "A card with a title, a line and its actions.",
        "text" => "Markdown, or one plain styled line.",
        "prose" => "Headings, paragraphs, lists, quotes and code.",
        "hero" => "A page's opening: a title, a line, a picture, its actions.",
        "nav" => "A site's link bar.",
        "media" => "A picture or a video of a known size.",
        "images" => "A strip of images.",
        "pages" => "A document as the app's pictures of its pages: paged and zoomed, with its PDF.",
        "diagram" => "A diagram from its source, with counts on its nodes.",
        "list" => "A list of rows.",
        "row" => "One row: a title, a line, a value.",
        "stat" => "Figures: one tile, or a list of tiles.",
        "steps" => "A stepper with its current step, or progress bars.",
        "chart" => "Bars, stacked bars, a line, a combo or a donut, with its legend and table.",
        "chips" => "A row of chips, one or many picked.",
        "button" => "A button that posts its action.",
        "choice" => "A question with options and a free answer.",
        "form" => "Fields and a submit.",
        "composer" => "A message box, its pickers and its send action.",
        "run" => "A command someone approves to run.",
        "config" => "Settings as fields.",
        "secret" => "A secret's input; its value is never sent back.",
        "diff" => "A file's diff.",
        "editor" => "A text editor and its errors.",
        "lines" => "Rows of fields with add and remove, totals and a balance check.",
        "web" => "A web view of a fixed height.",
        "scene" => "Workers at work, each in its state.",
        "island" => "An app's own component, its props in and events out.",
        "table" => "Typed columns: sort, filter, totals, row select and export; rows on a phone.",
        "toast" => "A short line after an action, in a tone, with an optional undo.",
        "timeline" => "Rows of bars on a day axis: move a bar or pull an edge, by pointer, keys or VoiceOver.",
        "import" => {
            "A spreadsheet import the app's server reads: upload, the column match and row errors, then one confirm."
        }
        _ => "",
    }
}

fn kind_of(b: &Block) -> String {
    let v = serde_json::to_value(b).unwrap_or_default();
    v.get("type").and_then(Value::as_str).unwrap_or_default().into()
}

fn button(id: &str, label: &str, style: ButtonStyle) -> Block {
    b!(Button(Button::new(label).id(id).style(style).action(id)))
}

fn chip(v: &str) -> ChipOption {
    ChipOption {
        value: v.into(),
        label: v.into(),
    }
}

fn field(name: &str, label: &str, value: FieldValue) -> Field {
    TextField::new(name).label(label).value(value).into()
}

fn toggle(name: &str, label: &str, on: bool) -> Field {
    ToggleField::new(name).label(label).value(FieldValue::Flag(on)).into()
}

fn picker(name: &str, label: &str, options: &[&str]) -> Field {
    let mut p = PickerField::new(name)
        .label(label)
        .options(options.iter().map(|o| (*o).to_string()).collect::<Vec<_>>());
    p.value = options.first().map(|o| FieldValue::Text((*o).into()));
    p.into()
}

fn sample_svg(alt: &str) -> Image {
    Image {
        src: "media/sample.svg".into(),
        alt: Some(alt.into()),
        caption: None,
    }
}

fn holders() -> Vec<Block> {
    let screen = Screen::new().id("today").title("Today").blocks(vec![
        text("today-hint", "3 builds ran, 1 needs you."),
        marked("today-deploy", "Deploy", "waiting on review", "", Tone::Needs),
    ]);
    let sheet = Sheet::new(
        "Add a check",
        vec![
            text("add-note", "Pick what runs on each push."),
            b!(Chips(
                Chips::new("runs", vec![chip("lint"), chip("test"), chip("bench")])
                    .id("add-runs")
                    .multi(true)
                    .selected(vec!["lint".to_string(), "test".to_string()])
            )),
            button("add-check", "add", ButtonStyle::Primary),
        ],
    )
    .id("add");
    let card = Card::new()
        .id("ship-notes")
        .kind(CardKind::Ask)
        .title("Ship the 0.4 notes?")
        .subtitle("asked 12 minutes ago · release")
        .badge(Label {
            text: "needs you".into(),
            tone: Some(Tone::Needs),
        })
        .buttons(vec![
            button("ship", "ship", ButtonStyle::Primary),
            button("hold", "hold", ButtonStyle::Plain),
            button("discard", "discard", ButtonStyle::Destructive),
        ]);
    vec![
        b!(Screen(screen)),
        section(
            "due",
            "Due soon · 2",
            vec![
                b!(Row(row("due-cert", "Renew the cert", "expires Friday", "3d"))),
                b!(Row(row("due-keys", "Rotate keys", "monthly", "5d"))),
            ],
        ),
        b!(Sheet(sheet)),
        b!(Card(card)),
    ]
}

fn words() -> Vec<Block> {
    let prose = Prose::new(vec![
        heading("Release notes"),
        para(vec![span("The diff is now "), bold("typed"), span(" end to end.")]),
        Part::List {
            ordered: false,
            items: vec![
                vec![span("rows keep their place")],
                vec![span("forms check as you type")],
            ],
        },
        Part::Quote {
            spans: vec![span("One shape, three renderers.")],
        },
        listing("rust", "Row::new(\"build\").value(Shown::Text(\"2m\".into()))"),
    ])
    .id("notes");
    let chart = Media::new("media/sample.svg", "a bar chart", 640_u32, 360_u32);
    let hero = Hero::new("Weekly report")
        .id("report")
        .subtitle("What moved, what waits, what broke.")
        .media(chart.clone())
        .actions(vec![Act {
            label: "open".into(),
            tap: Some(open("gallery.html#kind-hero")),
            ..Act::default()
        }]);
    let link = |label: &str| NavLink {
        label: label.into(),
        href: "gallery.html#kind-nav".into(),
        current: (label == "docs").then_some(true),
    };
    let nav = Nav::new(vec![link("docs"), link("guides"), link("changelog")])
        .id("acme-nav")
        .brand(link("Acme"));
    let shots = ["home", "list", "form", "dark"].map(sample_svg).to_vec();
    vec![
        b!(Text(Text::new().id("green").markdown(
            "**Builds are green.** The last one took `2m 14s`, see https://github.com/jirathip-dev/blocks"
        ))),
        b!(Prose(prose)),
        b!(Hero(hero)),
        b!(Nav(nav)),
        b!(Media(
            chart
                .id("downloads")
                .caption("Downloads by week, 8 weeks, marked up")
                .marks(markup())
        )),
        b!(Images(Images::new(shots).id("shots"))),
        b!(Diagram(release())),
    ]
}

fn release() -> Diagram {
    let source = "[*] --> queued\nqueued --> building\nbuilding --> review\nbuilding --> failed\nfailed --> building\nreview --> merged";
    let counts: BTreeMap<String, Number> = [
        ("queued", 4),
        ("building", 2),
        ("review", 1),
        ("failed", 0),
        ("merged", 12),
    ]
    .map(|(k, n)| (k.to_string(), Number::from(n)))
    .into_iter()
    .collect();
    let node = |state: Tone| Node {
        state: Some(state),
        ..Node::default()
    };
    let nodes: BTreeMap<String, Node> = [
        ("building", node(Tone::Working)),
        ("review", node(Tone::Needs)),
        ("failed", node(Tone::Fail)),
    ]
    .map(|(k, n)| (k.to_string(), n))
    .into_iter()
    .collect();
    Diagram::new(source)
        .id("release")
        .title("Release flow")
        .counts(counts)
        .nodes(blocks::Nodes::Map(nodes))
}

fn stage(id: &str, label: &str, sub: Option<&str>, tap: bool) -> Stage {
    Stage {
        id: id.into(),
        label: label.into(),
        sub: sub.map(Into::into),
        tap: tap.then(|| Tap {
            action: Some(format!("open-{id}")),
            ..Tap::default()
        }),
    }
}

fn bar(label: &str, value: u8, tone: Option<Tone>, sub: &str) -> Bar {
    Bar {
        label: label.into(),
        value,
        tone,
        sub: Some(sub.into()),
    }
}

fn figures() -> Vec<Block> {
    let tile = |label: &str, value: u64, unit: Option<&str>, tone: Option<Tone>| Tile {
        label: label.into(),
        value: Shown::Number(value.into()),
        unit: unit.map(Into::into),
        tone,
        spark: None,
    };
    let rows = vec![
        marked("b-build", "Build", "green, 2 minutes ago", "2m", Tone::Done),
        marked("b-deploy", "Deploy", "waiting on review", "", Tone::Needs),
        marked("b-lint", "Lint", "3 warnings", "40s", Tone::Fail),
        marked("b-docs", "Docs", "published", "1m", Tone::Done),
        marked("b-bench", "Bench", "within budget", "6m", Tone::Done),
    ];
    vec![
        b!(List(List::new(rows).id("builds"))),
        marked(
            "build-212",
            "Build #212",
            "green · main · 2 minutes ago",
            "2m 14s",
            Tone::Done,
        ),
        b!(Stat(Stat::new().id("week").items(vec![
            tile("open", 3, None, None),
            tile("p50", 12, Some("ms"), None),
            tile("failing", 2, None, Some(Tone::Warn)),
        ]))),
        b!(Steps(
            Steps::new()
                .id("stop")
                .title("Stop 3 of 8 · Marlow Bakery")
                .steps(vec![
                    stage("stop", "Stop", Some("arrived 09:42"), true),
                    stage("lines", "Lines", Some("4 of 6 checked"), false),
                    stage("proof", "Proof", None, false),
                ])
                .current("lines")
        )),
        b!(Steps(Steps::new().id("planner").title("Planned maintenance").bars(
            vec![
                bar("Boiler service", 100, Some(Tone::Ok), "done Mon"),
                bar("Roof gutters", 40, None, "2 of 5 blocks"),
                bar("Fire door closers", 15, Some(Tone::Bad), "overdue since Fri"),
            ]
        ))),
        b!(Chips(
            Chips::new("effort", vec![chip("low"), chip("medium"), chip("high"), chip("max")])
                .id("effort")
                .selected(vec!["medium".to_string()])
        )),
    ]
    .into_iter()
    .chain(
        blocks::samples()
            .into_iter()
            .filter(|(k, _)| *k == "chart")
            .map(|(_, b)| b),
    )
    .collect()
}

fn input() -> Vec<Block> {
    let option = |value: &str, label: &str| ChoiceOption {
        value: value.into(),
        label: label.into(),
        ..ChoiceOption::default()
    };
    let choice = Choice::new(
        "when",
        vec![
            option("friday", "Ship on Friday"),
            option("now", "Ship now"),
            option("later", "Hold for 0.5"),
        ],
    )
    .id("when")
    .question("When do the 0.4 notes ship?")
    .recommended("friday")
    .other(Other {
        placeholder: Some("other…".into()),
        r#for: None,
    });
    let form = Form::new(vec![
        field("name", "Name", FieldValue::Text("Ada Lovelace".into())),
        field("email", "Email", FieldValue::Text("ada@example.com".into())),
        picker("plan", "Plan", &["team", "solo", "school"]),
        toggle("updates", "Updates", true),
    ])
    .id("signup")
    .submit(Submit {
        label: "sign up".into(),
        action: "sign-up".into(),
        ..Submit::default()
    });
    let pick = |name: &str, all: &[&str]| ComposerChip {
        name: name.into(),
        cur: all.first().map(|s| (*s).to_string()),
        all: all.iter().map(|s| (*s).to_string()).collect(),
    };
    let composer = Composer::new("say")
        .id("say")
        .label("send")
        .placeholder("message the team")
        .chips(vec![
            pick("model", &["fast", "deep"]),
            pick("effort", &["medium", "high"]),
        ])
        .queued(vec![Queued {
            q: 1,
            text: "rerun the bench on main".into(),
        }]);
    let run = Run::new("approve", "cargo test --workspace --release", "4f2a9c1")
        .id("tests")
        .dir("crates")
        .touches("the test target only");
    vec![
        button("save", "save", ButtonStyle::Primary),
        button("preview", "preview", ButtonStyle::Plain),
        button("delete", "delete", ButtonStyle::Destructive),
        b!(Choice(choice)),
        b!(Form(form)),
        b!(Composer(composer)),
        b!(Run(run)),
    ]
}

fn others() -> Vec<Block> {
    let settings = Form::new(vec![
        picker("region", "Region", &["eu-west", "us-east"]),
        field("retries", "Retries", FieldValue::Number(3.into())),
        toggle("notify", "Notify", false),
    ])
    .id("settings")
    .action("save-settings");
    let hunk = Hunk {
        at: "@@ -12,3 +12,4 @@".into(),
        lines: vec![
            " fn total(rows: &[Row]) -> u64 {".into(),
            "-    rows.len()".into(),
            "+    let n = rows.len();".into(),
            "+    n.try_into().unwrap_or(u64::MAX)".into(),
            " }".into(),
        ],
    };
    let lane = |id: &str, title: &str, stage: &str, state: LaneState| Lane {
        id: id.into(),
        title: title.into(),
        stage: Some(stage.into()),
        state,
        ..Lane::default()
    };
    let island = Island::new(
        "x-chart",
        Fallback {
            title: "Downloads by week".into(),
            subtitle: Some("the chart needs JS; 1,204 last week".into()),
            tap: None,
        },
    )
    .id("chart")
    .events(vec!["pick".to_string()])
    .size(IslandSize {
        aspect: Some("16:7".into()),
        ..IslandSize::default()
    });
    vec![
        b!(Config(settings)),
        b!(Secret(
            Secret::new("token", "save-token")
                .id("token")
                .label("API token")
                .placeholder("paste a token")
                .set(true)
        )),
        b!(Diff(Diff::new("src/lib.rs", vec![hunk]).id("change").summary("+2 −1"))),
        b!(Editor(
            Editor::new("notes", "# Notes\n\nShip on Friday.\nCheck the bench\n", "save-notes")
                .id("editor")
                .errors(vec![LineError {
                    line: 4,
                    message: "a line ends with no full stop".into(),
                }])
        )),
        b!(Web(Web::new("media/sample.svg", 240_u32).id("doc"))),
        b!(Scene(Scene::new().id("crew").label("Workers").lanes(vec![
            lane("w1", "build", "compile", LaneState::Working),
            lane("w2", "review", "read the diff", LaneState::Needs),
            lane("w3", "docs", "publish", LaneState::Done),
            lane("w4", "bench", "wait", LaneState::Idle),
        ]))),
        b!(Island(island)),
    ]
}

fn document() -> Block {
    let page = |n: u32, alt: &str| blocks::PageImage {
        src: "media/page.svg".into(),
        alt: format!("{alt}, page {n}"),
        width: 620,
        height: 877,
    };
    b!(Pages(
        Pages::new(vec![page(1, "Priced items"), page(2, "Terms"), page(3, "Acceptance")])
            .id("quote")
            .title("Quotation Q-0418")
            .note("Drawn by the app's server; zoom and paging send nothing.")
    ))
}

/// Every core kind's sample, one or more blocks each, in `Block::KINDS` order.
pub fn samples() -> Vec<(String, Vec<Block>)> {
    let picked = |kind: &str| {
        blocks::samples()
            .into_iter()
            .filter(|(k, _)| *k == kind)
            .map(|(_, b)| b)
            .collect::<Vec<_>>()
    };
    let all = [
        holders(),
        words(),
        figures(),
        input(),
        picked("lines"),
        others(),
        picked("table"),
        picked("toast"),
        vec![document()],
        picked("timeline"),
        picked("import"),
        vec![paperwork()],
    ]
    .concat();
    Block::KINDS
        .iter()
        .map(|k| {
            let of: Vec<Block> = all.iter().filter(|b| kind_of(b) == *k).cloned().collect();
            ((*k).to_string(), of)
        })
        .collect()
}

/// Whether the static renderer draws this kind only through its fallback.
pub fn fallback_only(sample: &[Block]) -> bool {
    sample.iter().all(|b| {
        let html = fragment(&Built::new(serde_json::to_value(b).unwrap_or_default()), "");
        html.split('>').next().is_some_and(|tag| tag.contains("data-fallback"))
    })
}

fn groups(all: &[(String, Vec<Block>)]) -> Vec<(String, Vec<String>)> {
    let fb: Vec<&str> = all
        .iter()
        .filter(|(_, s)| fallback_only(s))
        .map(|(k, _)| k.as_str())
        .collect();
    let placed: Vec<&str> = GROUPS.iter().flat_map(|(_, ks)| ks.iter().copied()).collect();
    let keep = |ks: Vec<&str>| ks.into_iter().filter(|k| !fb.contains(k)).map(String::from).collect();
    let mut out: Vec<(String, Vec<String>)> = GROUPS
        .iter()
        .map(|(g, ks)| ((*g).to_string(), keep(ks.to_vec())))
        .collect();
    let rest = all
        .iter()
        .map(|(k, _)| k.as_str())
        .filter(|k| !placed.contains(k))
        .collect();
    out.push(("Other kinds".into(), keep(rest)));
    out.push((
        "Fallback only, no HTML view yet".into(),
        fb.into_iter().map(String::from).collect(),
    ));
    out.retain(|(_, ks)| !ks.is_empty());
    out
}

fn marker(kind: &str) -> Block {
    b!(Text(
        Text::new()
            .id(format!("fb-{kind}"))
            .markdown("No HTML view yet: this is its fallback")
            .tone(Tone::Warn)
    ))
}

fn tile(kind: &str, sample: &[Block], fb: bool) -> Block {
    let head = link_row(
        &format!("go-{kind}"),
        kind,
        about(kind),
        "its page",
        &format!("kind-{kind}.html"),
    );
    let mut blocks = vec![head];
    blocks.extend(fb.then(|| marker(kind)));
    blocks.push(section(&format!("spec-{kind}"), "", sample.to_vec()));
    section(&format!("kind-{kind}"), "", blocks)
}

/// The gallery: every core kind's sample, grouped; the fallback-only group as the renderer has it.
pub fn gallery(all: &[(String, Vec<Block>)]) -> Page {
    let groups = groups(all);
    let fb = all.iter().filter(|(_, s)| fallback_only(s)).count();
    let intro = text(
        "intro",
        &format!(
            "All {} core kinds, each drawn by the real HTML renderer from a sample this site builds with the typed API. The {fb} kinds the renderer has no HTML view for yet draw the fallback every block carries, and say so; the build works that group out from the renderer. The same samples drawn by the egui renderer, on a canvas: [the egui demo]({}egui/).",
            all.len(),
            crate::BASE
        ),
    );
    let jump = Nav::new(
        groups
            .iter()
            .flat_map(|(_, ks)| ks.iter())
            .map(|k| NavLink {
                label: k.clone(),
                href: format!("#kind-{k}"),
                current: None,
            })
            .collect::<Vec<_>>(),
    )
    .id("jump");
    let mut body = vec![intro, b!(Nav(jump))];
    for (i, (g, ks)) in groups.iter().enumerate() {
        let tiles = ks
            .iter()
            .filter_map(|k| all.iter().find(|(x, _)| x == k))
            .map(|(k, s)| tile(k, s, fallback_only(s)))
            .collect();
        body.push(section(&format!("group-{i}"), &format!("{g} · {}", ks.len()), tiles));
    }
    page(
        "gallery",
        "gallery.html",
        "Gallery",
        "Every core kind of blocks, drawn by its HTML renderer from a sample.",
        body,
    )
}

fn fallback_of(kind: &str, sample: &[Block]) -> Vec<Block> {
    let screen = Built::of(&Screen::new().blocks(sample.to_vec()));
    let first = screen.value().pointer("/blocks/0/fallback").cloned();
    match first.and_then(|f| serde_json::from_value::<Fallback>(f).ok()) {
        Some(f) => vec![
            text(
                "fb-note",
                &format!("What a renderer without `{kind}` draws: a row from the fallback the block carries."),
            ),
            section(
                "fb-drawn",
                "",
                vec![b!(Row(Row::new(f.title)
                    .id("fb-row")
                    .subtitle(blocks::Toned::Text(f.subtitle.unwrap_or_default()))))],
            ),
        ],
        None => vec![text(
            "fb-note",
            &format!("Every renderer draws `{kind}` itself: it carries no fallback."),
        )],
    }
}

/// One kind's page: its sample drawn, its Rust and JSON, its fallback, its style hooks and the kinds either side.
pub fn kind_page(all: &[(String, Vec<Block>)], at: usize) -> Option<Page> {
    let (kind, sample) = all.get(at)?;
    let json = play::json(&play::screen(kind, sample));
    let prev = all.get(at.checked_sub(1).unwrap_or(all.len() - 1))?;
    let next = all.get((at + 1) % all.len())?;
    let id = sample.first().and_then(Block::id).unwrap_or_default();
    let hooks = vec![
        b!(Row(row("hook-class", &format!(".b-{kind}"), "the block", ""))),
        b!(Row(row(
            "hook-kind",
            &format!("[data-block={kind}]"),
            "every block of the kind",
            ""
        ))),
        b!(Row(row("hook-id", &format!("[data-id={id}]"), "this one block", ""))),
    ];
    let link = |label: &str, href: String, current: bool| NavLink {
        label: label.into(),
        href,
        current: current.then_some(true),
    };
    let around = Nav::new(vec![
        link(&format!("← {}", prev.0), format!("kind-{}.html", prev.0), false),
        link("gallery", format!("gallery.html#kind-{kind}"), false),
        link(&format!("{} →", next.0), format!("kind-{}.html", next.0), false),
    ])
    .id("around");
    let tabs = Nav::new(vec![
        link("Rust", "#rust".into(), true),
        link("JSON", "#json".into(), false),
        link("edit in the playground →", format!("playground.html#k={kind}"), false),
    ])
    .id("tabs");
    let rust: Vec<Part> = play::cuts(sample)
        .iter()
        .flat_map(|c| {
            let at = format!("{}:{}–{}", c.file, c.from, c.to);
            [
                para(vec![Span {
                    link: Some(play::source_url(c)),
                    ..span(&at)
                }]),
                listing("rust", &c.code),
            ]
        })
        .collect();
    let mut drawn = vec![section("spec", "", sample.clone())];
    if fallback_only(sample) {
        drawn.insert(0, marker(kind));
    }
    let body = vec![
        text("about", about(kind)),
        section(
            "pair-sample",
            "",
            vec![
                section("drawn", "Drawn", drawn),
                section(
                    "sample",
                    "The sample",
                    vec![
                        b!(Nav(tabs)),
                        b!(Prose(Prose::new(rust).id("rust"))),
                        b!(Prose(Prose::new(vec![listing("json", &json)]).id("json"))),
                    ],
                ),
            ],
        ),
        section(
            "pair-hooks",
            "",
            vec![
                section("fallback", "Its fallback", fallback_of(kind, sample)),
                section("hooks", "Style hooks", vec![b!(List(List::new(hooks).id("hook-list")))]),
            ],
        ),
        b!(Nav(around)),
    ];
    let description = format!("{kind}: {} Drawn by blocks' HTML renderer.", about(kind));
    Some(page("gallery", &format!("kind-{kind}.html"), kind, &description, body)).map(|p| Page {
        screen: p.screen.id(format!("kind-{kind}")),
        js: "play.js",
        ..p
    })
}

fn paperwork() -> Block {
    let photos = UploadField::new("photos")
        .label("Photos of the damage")
        .accept(vec![Accept::Image])
        .capture(true)
        .many(true)
        .mb(10u32);
    let note = ScanField::new("note").label("Delivery note").max(20u32);
    let pin = SecretField::new("pin").label("Order PIN").placeholder("4 digits");
    b!(Form(
        Form::new(vec![photos.into(), note.into(), pin.into()])
            .id("claim")
            .submit(Submit {
                label: "send claim".into(),
                action: "send-claim".into(),
                ..Submit::default()
            })
    ))
}

#[cfg(test)]
mod tests {
    use blocks::{Block, Field};
    use serde_json::Value;

    use super::{about, samples};

    #[test]
    fn every_core_kind_has_a_blurb_and_a_sample() {
        let all = samples();
        assert_eq!(all.len(), Block::KINDS.len());
        for (kind, sample) in &all {
            assert!(!about(kind).is_empty(), "{kind}: no blurb");
            assert!(!sample.is_empty(), "{kind}: no sample");
        }
    }

    fn field_types(v: &Value, out: &mut Vec<String>) {
        match v {
            Value::Object(o) => {
                for f in o.get("fields").and_then(Value::as_array).into_iter().flatten() {
                    out.extend(f.get("type").and_then(Value::as_str).map(String::from));
                }
                o.values().for_each(|x| field_types(x, out));
            }
            Value::Array(a) => a.iter().for_each(|x| field_types(x, out)),
            _ => {}
        }
    }

    #[test]
    fn every_field_type_is_in_a_sample() {
        let mut used = Vec::new();
        field_types(&serde_json::to_value(samples()).unwrap(), &mut used);
        for t in Field::TYPES {
            assert!(used.iter().any(|u| u == t), "field type {t}: in no sample");
        }
    }
}
