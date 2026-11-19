use super::{
    Act, Block, Button, Card, CardKind, ChipOption, Chips, Choice, ChoiceOption, Composer, Diagram, Diff, Editor,
    Fallback, Field, FieldKind, Form, Hero, Hunk, Image, Images, Island, Keyboard, Label, Lane, LaneState, LineItem,
    Lines, Link, List, Media, Nav, NavLink, Part, Prose, Round, RoundLane, Row, RowError, Run, Scene, Screen, Secret,
    Section, Sheet, Shown, Span, Stage, Stat, Steps, Submit, Tap, Text, Time, Toned, Web,
};
use crate::expr::{Expr, Lit, State};

fn span(text: &str) -> Span {
    Span {
        text: text.into(),
        ..Span::default()
    }
}

fn text(id: &str, markdown: &str) -> Block {
    Block::Text(Box::new(Text::new().id(id).markdown(markdown)))
}

fn step(id: &str, label: &str, sub: &str) -> Stage {
    Stage {
        id: id.into(),
        label: label.into(),
        sub: Some(sub.into()),
        tap: Some(Tap {
            open: Some(id.into()),
            ..Tap::default()
        }),
    }
}

fn field(name: &str, label: &str) -> Field {
    Field {
        kind: FieldKind::Text,
        name: name.into(),
        label: Some(label.into()),
        ..Field::default()
    }
}

fn lines() -> Lines {
    let money = |name: &str, label: &str| Field {
        keyboard: Some(Keyboard::Number),
        ..field(name, label)
    };
    let account = Field {
        kind: FieldKind::Picker,
        options: Some(vec![
            "6100 Rent".into(),
            "6200 Utilities".into(),
            "2100 Payables".into(),
        ]),
        ..field("account", "Account")
    };
    let row = |id: &str, values: &[(&str, &str)]| LineItem {
        id: id.into(),
        values: values.iter().map(|(k, v)| ((*k).to_string(), (*v).into())).collect(),
    };
    let rows = vec![
        row(
            "l1",
            &[("account", "6100 Rent"), ("memo", "office rent"), ("debit", "2400")],
        ),
        row(
            "l2",
            &[("account", ""), ("memo", "power and water"), ("debit", "318.40")],
        ),
        row(
            "l3",
            &[
                ("account", "2100 Payables"),
                ("memo", "landlord"),
                ("credit", "2668.50"),
            ],
        ),
    ];
    let columns = vec![
        account,
        field("memo", "Description"),
        money("debit", "Debit"),
        money("credit", "Credit"),
    ];
    let error = RowError {
        row: Some("l2".into()),
        name: Some("account".into()),
        message: "pick an account for line 2".into(),
    };
    Lines::new("lines", columns, rows)
        .id("journal")
        .label("journal lines")
        .action("check-journal")
        .sum(vec!["debit".to_string(), "credit".to_string()])
        .balance(["debit".to_string(), "credit".to_string()])
        .min(2_u32)
        .adds("add line")
        .errors(vec![error])
        .submit(Submit {
            label: "post entry".into(),
            action: "post-journal".into(),
            ..Submit::default()
        })
}

fn content() -> Vec<Block> {
    let prose = Prose::new(vec![
        Part::Heading {
            level: 2,
            spans: vec![span("Blocks")],
        },
        Part::Para {
            spans: vec![
                span("Typed "),
                Span {
                    bold: Some(true),
                    ..span("screens")
                },
            ],
        },
        Part::List {
            ordered: false,
            items: vec![vec![span("one")], vec![span("two")]],
        },
        Part::Quote {
            spans: vec![span("Built by type.")],
        },
        Part::Code {
            lang: Some("rust".into()),
            text: "Row::new(\"a\")".into(),
        },
        Part::Rule,
    ]);
    let media = Media::new("/media/chart.png", "a bar chart", 640_u32, 360_u32).caption("This week");
    let act = Act {
        label: "Start".into(),
        action: Some("start".into()),
        ..Act::default()
    };
    let link = |label: &str, href: &str| NavLink {
        label: label.into(),
        href: href.into(),
        current: None,
    };
    let fallback = Fallback {
        title: "The map".into(),
        ..Fallback::default()
    };
    let props = serde_json::Map::from_iter([("zoom".into(), serde_json::Value::from(3))]);
    let hero = Hero::new("Blocks")
        .id("hero")
        .subtitle("One shape, three renderers")
        .media(media.clone())
        .actions(vec![act]);
    let island = Island::new("x-map", fallback)
        .id("map")
        .props(props)
        .events(vec!["pick".to_string()]);
    vec![
        Block::Prose(Box::new(prose.id("about"))),
        Block::Hero(Box::new(hero)),
        Block::Media(Box::new(media.id("chart"))),
        Block::Nav(Box::new(
            Nav::new(vec![link("Docs", "/docs")])
                .id("nav")
                .brand(link("Blocks", "/")),
        )),
        Block::Island(Box::new(island)),
    ]
}

fn controls() -> Vec<Block> {
    let option = ChoiceOption {
        value: "yes".into(),
        label: "Yes".into(),
        ..ChoiceOption::default()
    };
    let chip = |v: &str| ChipOption {
        value: v.into(),
        label: v.into(),
    };
    vec![
        Block::Choice(Box::new(
            Choice::new("answer", vec![option]).id("ask").question("Merge it?"),
        )),
        Block::Form(Box::new(
            Form::new(vec![field("email", "Email")]).id("signup").action("sign-up"),
        )),
        Block::Config(Box::new(
            Form::new(vec![field("repo", "Repo")]).id("settings").action("save"),
        )),
        Block::Secret(Box::new(
            Secret::new("token", "save-token").id("token").label("API token"),
        )),
        Block::Run(Box::new(
            Run::new("approve", "cargo test", "4f2a9c1").id("run").dir("crates"),
        )),
        Block::Button(Box::new(Button::new("Save").id("save").action("save"))),
        Block::Chips(Box::new(
            Chips::new("effort", vec![chip("low"), chip("high")]).id("effort"),
        )),
        Block::Editor(Box::new(Editor::new("notes", "hello", "save-notes").id("editor"))),
        Block::Composer(Box::new(Composer::new("say").id("say").placeholder("message the team"))),
        Block::Lines(Box::new(lines())),
    ]
}

fn card() -> Card {
    let at = |since: Option<&str>, until: Option<&str>, label: &str| Time {
        since: since.map(Into::into),
        until: until.map(Into::into),
        label: Some(label.into()),
    };
    let ago = |label: &str| at(Some("2026-11-09T09:35:00Z"), None, label);
    let left = |label: &str| at(None, Some("2026-11-09T09:53:00Z"), label);
    let timed = Row::new("Review")
        .id("card-row")
        .subtitle(Toned::Label(Label {
            text: left("decides in {rel}").into(),
            tone: None,
        }))
        .value(ago("{} ago"));
    Card::new()
        .id("card")
        .kind(CardKind::Ask)
        .title("q1")
        .subtitle("waiting")
        .meta(ago("as of {} ago"))
        .badge(Label {
            text: left("lapses in {rel}").into(),
            tone: None,
        })
        .blocks(vec![
            Block::Row(Box::new(timed)),
            Block::Stat(Box::new(Stat::new().id("card-up").label("up").value(ago("{}")))),
        ])
}

fn views() -> Vec<Block> {
    let row = Row::new("Build")
        .id("build")
        .subtitle(Toned::Text("green".into()))
        .value(Shown::Text("2m".into()));
    let lane = Lane {
        id: "impl-1".into(),
        title: "impl".into(),
        state: LaneState::Working,
        ..Lane::default()
    };
    let past = Round {
        id: "r1".into(),
        name: "impl".into(),
        state: LaneState::Done,
        summary: Some("pushed".into()),
        tap: Some(Tap {
            url: Some("/runs/1".into()),
            ..Tap::default()
        }),
        ..Round::default()
    };
    let now = Round {
        id: "r2".into(),
        name: "review 1".into(),
        state: LaneState::Needs,
        summary: Some("one finding".into()),
        lane: Some(RoundLane {
            name: Some("rev-1".into()),
            lines: Some(vec!["reading the diff".into()]),
            ..RoundLane::default()
        }),
        blocks: Some(vec![text("finding", "Fix the test")]),
        links: Some(vec![Link {
            label: "verdict".into(),
            tap: Tap {
                url: Some("/verdict".into()),
                ..Tap::default()
            },
        }]),
        ..Round::default()
    };
    let image = Image {
        src: "/media/a.png".into(),
        alt: Some("a".into()),
        caption: None,
    };
    let hunk = Hunk {
        at: "@@ -1 +1 @@".into(),
        lines: vec!["-a".into(), "+b".into()],
    };
    vec![
        Block::Row(Box::new(row.clone())),
        Block::List(Box::new(
            List::new(vec![Block::Row(Box::new(row.id("row").rounds(vec![past, now])))]).id("rows"),
        )),
        Block::Card(Box::new(card())),
        Block::Stat(Box::new(
            Stat::new().id("open").label("open").value(Shown::Number(3.into())),
        )),
        text("note", "**Hello**"),
        Block::Images(Box::new(Images::new(vec![image]).id("shots"))),
        Block::Web(Box::new(Web::new("/doc", 240_u32).id("doc"))),
        Block::Diff(Box::new(Diff::new("src/lib.rs", vec![hunk]).id("change"))),
        Block::Scene(Box::new(Scene::new().id("scene").label("lanes").lanes(vec![lane]))),
        Block::Diagram(Box::new(Diagram::new("[*] --> a\na --> b").id("flow").title("Flow"))),
    ]
}

fn stepper() -> Vec<Block> {
    vec![Block::Steps(Box::new(
        Steps::new()
            .id("stop")
            .title("Stop 3 of 8")
            .steps(vec![
                step("stop", "Stop", "arrived 09:42"),
                step("lines", "Lines", "6 checked"),
            ])
            .done(true),
    ))]
}

fn holders() -> Vec<Block> {
    let shown = Text::new().id("hint").markdown("Ready").show(Expr::Get("ready".into()));
    let state: State = [("ready".to_string(), Lit::Bool(true))].into_iter().collect();
    let screen = Screen::new()
        .id("home")
        .title("Home")
        .state(state)
        .blocks(vec![Block::Text(Box::new(shown))]);
    vec![
        Block::Screen(Box::new(screen)),
        Block::Sheet(Box::new(
            Sheet::new("Add a repo", vec![text("sheet-note", "Pick one")]).id("add"),
        )),
        Block::Section(Box::new(
            Section::new(vec![text("today-note", "Quiet")])
                .id("today")
                .header("Today"),
        )),
    ]
}

/// One typed sample per kind, keyed by its `type`; `fixtures/blocks` is written from them.
pub fn samples() -> Vec<(&'static str, Block)> {
    let all = [holders(), views(), controls(), content(), stepper()].concat();
    let kind = |b: &Block| {
        let v = serde_json::to_value(b).ok()?;
        let t = v.get("type")?.as_str()?.to_string();
        Block::KINDS.iter().copied().find(|k| *k == t)
    };
    let mut out: Vec<(&'static str, Block)> = all.into_iter().filter_map(|b| Some((kind(&b)?, b))).collect();
    out.sort_by_key(|(k, _)| Block::KINDS.iter().position(|x| x == k));
    out
}
