use super::{
    Act, Block, BulkAction, Button, Card, CardKind, Cell, ChipOption, Chips, Choice, ChoiceOption, Column, ColumnKind,
    Composer, Diagram, Diff, Editor, Era, ExportFormat, Fallback, Field, FieldKind, Form, Hero, Hunk, Image, Images,
    Island, Label, Lane, LaneState, Link, List, Media, Nav, NavLink, Part, PhonePart, Prose, Round, RoundLane, Row,
    Run, Scene, Screen, Secret, Section, Sheet, Shown, SortDir, Span, Stat, Table, TableRow, TableSelect, TableSort,
    Tap, Text, Tone, Toned, Total, Web,
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

fn field(name: &str, label: &str) -> Field {
    Field {
        kind: FieldKind::Text,
        name: name.into(),
        label: Some(label.into()),
        ..Field::default()
    }
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
    ]
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
    let card = Card::new()
        .id("card")
        .kind(CardKind::Ask)
        .title("q1")
        .subtitle("waiting");
    vec![
        Block::Row(Box::new(row.clone())),
        Block::List(Box::new(
            List::new(vec![Block::Row(Box::new(row.id("row").rounds(vec![past, now])))]).id("rows"),
        )),
        Block::Card(Box::new(card)),
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

fn table() -> Block {
    let col = |id: &str, label: &str, kind: ColumnKind| Column {
        id: id.into(),
        label: label.into(),
        kind,
        ..Column::default()
    };
    let label = |text: &str, tone: Tone| {
        Cell::Label(Label {
            text: text.into(),
            tone: Some(tone),
        })
    };
    let row = |id: &str, client: &str, status: Cell, due: Option<&str>, late: Option<u32>, amount: u32| {
        let mut cells = std::collections::BTreeMap::from([
            ("inv".to_string(), Cell::Text(id.into())),
            ("client".into(), Cell::Text(client.into())),
            ("status".into(), status),
            ("amount".into(), Cell::Number(amount.into())),
        ]);
        cells.extend(due.map(|d| ("due".into(), Cell::Text(d.into()))));
        cells.extend(late.map(|l| ("late".into(), Cell::Number(l.into()))));
        TableRow {
            id: id.into(),
            cells,
            tap: Some(Tap {
                open: Some(format!("/invoice/{id}")),
                ..Tap::default()
            }),
        }
    };
    let columns = vec![
        Column {
            phone: Some(PhonePart::Meta),
            ..col("inv", "Invoice", ColumnKind::Text)
        },
        Column {
            width: Some(18),
            phone: Some(PhonePart::Title),
            ..col("client", "Client", ColumnKind::Text)
        },
        col("status", "Status", ColumnKind::Tone),
        Column {
            era: Some(Era::Be),
            ..col("due", "Due", ColumnKind::Date)
        },
        Column {
            unit: Some("days".into()),
            tone: Some(Tone::Warn),
            max: Some(60.into()),
            digits: Some(0),
            ..col("late", "Overdue", ColumnKind::Bar)
        },
        Column {
            currency: Some("THB".into()),
            total: Some(Total::Sum),
            ..col("amount", "Amount", ColumnKind::Money)
        },
    ];
    let rows = vec![
        row(
            "INV-0133",
            "Orchard Lane Clinic",
            label("overdue", Tone::Warn),
            Some("2026-10-18"),
            Some(32),
            48_750,
        ),
        row(
            "INV-0136",
            "Bluepeak Logistics",
            label("disputed", Tone::Bad),
            Some("2026-11-05"),
            Some(14),
            31_500,
        ),
        row(
            "INV-0138",
            "Saffron & Salt",
            label("sent", Tone::Done),
            Some("2026-11-19"),
            None,
            18_000,
        ),
        row(
            "INV-0139",
            "Tidewater Bakery",
            label("paid", Tone::Ok),
            Some("2026-11-26"),
            None,
            15_000,
        ),
        row(
            "INV-0143",
            "Moss Hill School",
            label("draft", Tone::Mute),
            None,
            None,
            13_500,
        ),
    ];
    let bulk = |action: &str, label: &str, bad: Option<bool>| BulkAction {
        action: action.into(),
        label: label.into(),
        bad,
    };
    let select = TableSelect {
        actions: vec![bulk("remind", "send reminder", None), bulk("void", "void", Some(true))],
    };
    let table = Table::new(columns, rows)
        .id("invoices")
        .title("Invoices")
        .sort(TableSort {
            by: "due".into(),
            dir: SortDir::Asc,
        })
        .empty("No invoices yet.")
        .select(select)
        .export(vec![ExportFormat::Csv, ExportFormat::Xlsx]);
    Block::Table(Box::new(table))
}

/// One typed sample per kind, keyed by its `type`; `fixtures/blocks` is written from them.
pub fn samples() -> Vec<(&'static str, Block)> {
    let all = [holders(), views(), controls(), content(), vec![table()]].concat();
    let kind = |b: &Block| {
        let v = serde_json::to_value(b).ok()?;
        let t = v.get("type")?.as_str()?.to_string();
        Block::KINDS.iter().copied().find(|k| *k == t)
    };
    let mut out: Vec<(&'static str, Block)> = all.into_iter().filter_map(|b| Some((kind(&b)?, b))).collect();
    out.sort_by_key(|(k, _)| Block::KINDS.iter().position(|x| x == k));
    out
}
