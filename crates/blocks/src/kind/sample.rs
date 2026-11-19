use super::{
    Act, Block, Button, Card, CardKind, ChipOption, Chips, Choice, ChoiceOption, Composer, Diagram, Diff, Editor,
    Fallback, Field, FieldKind, Form, Hero, Hunk, Image, Images, Island, Lane, LaneState, List, Media, Nav, NavLink,
    Part, Prose, Row, Run, Scene, Screen, Secret, Section, Sheet, Shown, Span, Stat, Text, Toned, Web,
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
            List::new(vec![Block::Row(Box::new(row.id("row")))]).id("rows"),
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

/// One typed sample per kind, keyed by its `type`; `fixtures/blocks` is written from them.
pub fn samples() -> Vec<(&'static str, Block)> {
    let all = [holders(), views(), controls(), content()].concat();
    let kind = |b: &Block| {
        let v = serde_json::to_value(b).ok()?;
        let t = v.get("type")?.as_str()?.to_string();
        Block::KINDS.iter().copied().find(|k| *k == t)
    };
    let mut out: Vec<(&'static str, Block)> = all.into_iter().filter_map(|b| Some((kind(&b)?, b))).collect();
    out.sort_by_key(|(k, _)| Block::KINDS.iter().position(|x| x == k));
    out
}
