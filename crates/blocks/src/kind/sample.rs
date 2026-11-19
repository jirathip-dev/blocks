use super::{
    Act, Block, BulkAction, Button, Card, CardKind, Cell, Chart, ChartFormat, ChartKind, ChipOption, Chips, Choice,
    ChoiceOption, Column, ColumnKind, Composer, Diagram, Diff, Editor, Era, ExportFormat, Fallback, Field, FieldKind,
    Form, Gesture, Hero, Hunk, Image, Images, Island, Keyboard, Label, Lane, LaneState, LineItem, Lines, Link, List,
    Media, Nav, NavLink, Part, PhonePart, Prose, Round, RoundLane, Row, RowError, Run, Scene, Screen, Secret, Section,
    Series, SeriesMark, Sheet, Shown, SortDir, Span, Stage, Stat, Steps, Submit, Table, TableRow, TableSelect,
    TableSort, Tap, Text, Time, Toast, Tone, Toned, Total, Undo, Web,
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
        Block::Chart(Box::new(chart())),
    ]
}

fn chart() -> Chart {
    let months = ["2024-01", "2024-02", "2024-03", "2024-04", "2024-05", "2024-06"];
    let series = |name: &str, values: [u32; 6]| Series {
        name: name.into(),
        values: values.map(|v| (v * 100_000).into()).to_vec(),
        ..Series::default()
    };
    let target = Series {
        tone: Some(Tone::Warn),
        mark: Some(SeriesMark::Line),
        ..series("Target", [110, 110, 120, 120, 120, 125])
    };
    Chart::new(
        "Revenue and target",
        ChartKind::Combo,
        months.map(String::from).to_vec(),
        vec![series("Revenue", [111, 106, 129, 118, 122, 114]), target],
    )
    .id("revenue")
    .era(Era::Be)
    .format(ChartFormat::ThbM)
    .selected("2024-03")
    .tap(Tap {
        action: Some("sales.month".into()),
        ..Tap::default()
    })
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

fn invoice(id: &str, client: &str, status: Cell, due: Option<&str>, late: Option<u32>, amount: u32) -> TableRow {
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
        ..TableRow::default()
    }
}

fn columns() -> Vec<Column> {
    let col = |id: &str, label: &str, kind: ColumnKind| Column {
        id: id.into(),
        label: label.into(),
        kind,
        ..Column::default()
    };
    vec![
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
    ]
}

fn markup() -> Vec<Column> {
    let col = |id: &str, label: &str, kind: ColumnKind, edit: bool| Column {
        id: id.into(),
        label: label.into(),
        kind,
        edit: edit.then_some(true),
        ..Column::default()
    };
    let money = |id: &str, label: &str, edit: bool| Column {
        currency: Some("THB".into()),
        total: (!edit).then_some(Total::Sum),
        ..col(id, label, ColumnKind::Money, edit)
    };
    vec![
        Column {
            width: Some(22),
            ..col("name", "Item", ColumnKind::Text, true)
        },
        Column {
            digits: Some(0),
            ..col("qty", "Qty", ColumnKind::Number, true)
        },
        Column {
            phone: Some(PhonePart::Meta),
            ..money("price", "Unit cost", true)
        },
        col("mult", "Mult", ColumnKind::Number, true),
        money("cost", "Cost", false),
        Column {
            unit: Some("%".into()),
            digits: Some(1),
            ..col("margin", "Margin", ColumnKind::Number, true)
        },
        money("sell", "Price", false),
        money("final", "Final", false),
    ]
}

fn item(id: &str, name: &str, n: [f64; 5]) -> TableRow {
    let [qty, price, mult, margin, fin] =
        n.map(|v| Cell::Number(serde_json::from_str(&v.to_string()).unwrap_or(0.into())));
    let cells = [
        ("qty", qty),
        ("price", price),
        ("mult", mult),
        ("margin", margin),
        ("final", fin),
    ];
    let mut cells: std::collections::BTreeMap<String, Cell> = cells.map(|(k, v)| (k.to_string(), v)).into();
    cells.insert("name".into(), Cell::Text(name.into()));
    TableRow {
        id: id.into(),
        cells,
        ..TableRow::default()
    }
}

fn grid() -> Block {
    let group = |id: &str, name: &str| TableRow {
        id: id.into(),
        cells: [("name".to_string(), Cell::Text(name.into()))].into(),
        group: Some(true),
        ..TableRow::default()
    };
    let get = |k: &str| Expr::Get(k.into());
    let cost = Expr::Mul(Box::new([Expr::Mul(Box::new([get("qty"), get("price")])), get("mult")]));
    let share = Expr::Div(Box::new([get("margin"), Expr::Lit(Lit::Num(100.into()))]));
    let keep = Expr::Sub(Box::new([Expr::Lit(Lit::Num(1.into())), share]));
    let sell = Expr::Div(Box::new([get("cost"), keep]));
    let rows = vec![
        group("g-pipe", "Pipework"),
        item("p1", "Steel pipe 2in, sch 40", [40.0, 410.0, 1.05, 18.0, 21_000.0]),
        item("p2", "Elbow 2in 90°", [24.0, 95.0, 1.05, 22.0, 3_100.0]),
        group("g-valve", "Valves"),
        item("v1", "Gate valve 3in", [4.0, 4_200.0, 1.1, 15.0, 21_800.0]),
        item("v2", "Ball valve 2in", [6.0, 1_650.0, 1.1, 15.0, 12_800.0]),
        group("g-lab", "Labour"),
        item("l1", "Fitter, day", [6.0, 2_400.0, 1.0, 25.0, 19_200.0]),
        TableRow {
            fixed: Some(true),
            ..item("l2", "Transport, by weight", [1.0, 5_600.0, 1.0, 0.0, 5_600.0])
        },
    ];
    let gesture = |action: &str, name: &str| Gesture {
        action: action.into(),
        name: name.into(),
        enabled: None,
    };
    let table = Table::new(markup(), rows)
        .id("grid")
        .title("Mark-up · K-12 tower")
        .calc(
            [("cost".to_string(), cost), ("sell".to_string(), sell)]
                .into_iter()
                .collect::<std::collections::BTreeMap<_, _>>(),
        )
        .edit(gesture("set-cell", "cell"))
        .reorder(gesture("order", "rows"));
    Block::Table(Box::new(table))
}

fn table() -> Block {
    let label = |text: &str, tone: Tone| {
        Cell::Label(Label {
            text: text.into(),
            tone: Some(tone),
        })
    };
    let rows = vec![
        invoice(
            "INV-0133",
            "Orchard Lane Clinic",
            label("overdue", Tone::Warn),
            Some("2026-10-18"),
            Some(32),
            48_750,
        ),
        invoice(
            "INV-0136",
            "Bluepeak Logistics",
            label("disputed", Tone::Bad),
            Some("2026-11-05"),
            Some(14),
            31_500,
        ),
        invoice(
            "INV-0138",
            "Saffron & Salt",
            label("sent", Tone::Done),
            Some("2026-11-19"),
            None,
            18_000,
        ),
        invoice(
            "INV-0139",
            "Tidewater Bakery",
            label("paid", Tone::Ok),
            Some("2026-11-26"),
            None,
            15_000,
        ),
        invoice(
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
    let table = Table::new(columns(), rows)
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

fn toast() -> Block {
    let ids = serde_json::Value::from(vec!["o-4821", "o-4822", "o-4825"]);
    let undo = Undo {
        action: "unarchive".into(),
        values: Some([("ids".to_string(), ids)].into_iter().collect()),
        ..Undo::default()
    };
    Block::Toast(Box::new(
        Toast::new("Archived 3 orders").id("archived").tone(Tone::Ok).undo(undo),
    ))
}

/// One typed sample per kind, keyed by its `type` (a table has two); `fixtures/blocks` is written from them.
pub fn samples() -> Vec<(&'static str, Block)> {
    let all = [
        holders(),
        views(),
        controls(),
        content(),
        stepper(),
        vec![table(), grid(), toast(), super::timeline::sample()],
    ]
    .concat();
    let kind = |b: &Block| {
        let v = serde_json::to_value(b).ok()?;
        let t = v.get("type")?.as_str()?.to_string();
        Block::KINDS.iter().copied().find(|k| *k == t)
    };
    let mut out: Vec<(&'static str, Block)> = all.into_iter().filter_map(|b| Some((kind(&b)?, b))).collect();
    out.sort_by_key(|(k, _)| Block::KINDS.iter().position(|x| x == k));
    out
}

/// Each sample with its fixture name: its kind, or `kind-id` for a kind's later samples.
pub fn fixtures() -> Vec<(String, Block)> {
    let mut seen: Vec<&str> = vec![];
    let mut out = vec![];
    for (kind, b) in samples() {
        let name = match b.id() {
            Some(id) if seen.contains(&kind) => format!("{kind}-{id}"),
            _ => kind.to_string(),
        };
        seen.push(kind);
        out.push((name, b));
    }
    out
}
