use blocks::expr::{Expr, Lit, Match, Pattern, State};
use blocks::{
    Block, Bound, Button, Check, Fallback, Field, FieldKind, FieldValue, Fields, Form, Island, IslandSize, List, Prose,
    Set, Shown, Stat, Tap, Tile,
};

use crate::ui::{b, heading, listing, page, row, section, text, Page};

fn get(key: &str) -> Expr {
    Expr::Get(key.into())
}

fn field(kind: FieldKind, name: &str, label: &str, value: FieldValue) -> Field {
    Field {
        kind,
        name: name.into(),
        label: Some(label.into()),
        value: Some(value),
        ..Field::default()
    }
}

fn bound(key: &str) -> Tile {
    Tile {
        label: key.into(),
        value: Shown::Get(Bound { get: key.into() }),
        ..Tile::default()
    }
}

fn rule(name: &str, key: &str, e: &Expr) -> String {
    format!("{name}.{key}: {}", serde_json::to_string(e).unwrap_or_default())
}

fn rows(id: &str, items: &[(&str, &str, &str)]) -> Block {
    let all: Vec<Block> = items
        .iter()
        .map(|(i, t, s)| b!(Row(row(&format!("{id}-{i}"), t, s, ""))))
        .collect();
    b!(List(List::new(all).id(id)))
}

pub fn behaviours() -> Page {
    let valid = Expr::Is(Box::new(Match {
        value: get("email"),
        pattern: Pattern::Email,
    }));
    let email = Field {
        placeholder: Some("you@example.org".into()),
        checks: Some(vec![Check {
            ok: valid.clone(),
            say: "needs a domain after the @".into(),
        }]),
        ..field(
            FieldKind::Text,
            "email",
            "Email",
            FieldValue::Text("ada@example.org".into()),
        )
    };
    let often = Field {
        options: Some(vec!["monthly".into(), "weekly".into()]),
        show: Some(get("updates")),
        ..field(
            FieldKind::Picker,
            "often",
            "How often",
            FieldValue::Text("monthly".into()),
        )
    };
    let updates = field(FieldKind::Toggle, "updates", "Updates", FieldValue::Flag(false));
    let signed = Set {
        key: "signed".into(),
        to: get("email"),
    };
    let sign_up = Button::new("sign up").id("sign-up").enabled(valid.clone()).tap(Tap {
        set: Some(vec![signed]),
        ..Tap::default()
    });
    let rules = [
        rule("email", "checks.ok", &valid),
        rule("often", "show", &get("updates")),
        rule("sign-up", "enabled", &valid),
    ]
    .join("\n");
    let p = page(
        "behaviours",
        "behaviours.html",
        "Behaviours",
        "A form whose fields show, hide, check and enable in the page, from typed expressions, with no server.",
        vec![
            text(
                "intro",
                "A screen carries small rules: a field's checks, when a field shows, when a control is on. The renderer runs them as you type; nothing goes to a server. With JS off, each block shows its start state and the page still reads.",
            ),
            section(
                "try",
                "Try it",
                vec![
                    b!(Form(Form::new(vec![updates]).id("updates"))),
                    b!(Form(Form::new(vec![email, often]).id("signup"))),
                    b!(Button(sign_up)),
                    b!(Stat(Stat::new().id("state").items(vec![
                        bound("email"),
                        bound("updates"),
                        bound("often"),
                        bound("signed")
                    ]))),
                ],
            ),
            b!(Prose(Prose::new(vec![heading("The rules on this screen"), listing("json", &rules)]).id("rules"))),
            section(
                "where",
                "Where they run",
                vec![rows(
                    "runs",
                    &[
                        ("web", "Web", "blocks.js runs them on each keystroke"),
                        ("swift", "SwiftUI", "the same rules, the same messages"),
                        ("static", "Static page, JS off", "the start state, as it reads before any typing"),
                    ],
                )],
            ),
        ],
    );
    let state: State = [("signed".to_string(), Lit::Str(String::new()))].into_iter().collect();
    Page {
        screen: p.screen.state(state),
        ..p
    }
}

pub fn islands() -> Page {
    let fallback = Fallback {
        title: "An echo of its props".into(),
        subtitle: Some("x-echo needs JS; until it loads, this row".into()),
        tap: None,
    };
    let props: Fields = [("says".to_string(), serde_json::Value::from("hello"))]
        .into_iter()
        .collect();
    let size = IslandSize {
        aspect: Some("16:7".into()),
        ..IslandSize::default()
    };
    let island = |id: &str, name: &str| {
        b!(Island(
            Island::new(name, fallback.clone())
                .id(id)
                .props(props.clone())
                .events(vec!["echo".to_string()])
                .size(size.clone())
        ))
    };
    page(
        "islands",
        "islands.html",
        "Islands",
        "The test component x-echo hosted in a blocks page, with its fallback beside it.",
        vec![
            text(
                "intro",
                "An island is a component the app brings, inside a blocks screen. blocks gives it props and passes its named events back as actions. Until it loads, and with JS off, it shows the fallback the block carries, in the box it reserves.",
            ),
            section(
                "pair-island",
                "",
                vec![
                    section("before", "Before it loads · x-later", vec![island("later", "x-later")]),
                    section("mounted", "Mounted · x-echo", vec![island("echo", "x-echo")]),
                ],
            ),
            section(
                "contract",
                "Its contract",
                vec![rows(
                    "terms",
                    &[
                        ("name", "name", "the custom element's tag: x-echo"),
                        ("props", "props in", "set at mount and after each update: says"),
                        ("events", "events out", "dispatched as blocks-event, sent as an action: echo"),
                        ("size", "size", "kept before it loads, so nothing jumps: 16:7"),
                    ],
                )],
            ),
            b!(Prose(Prose::new(vec![heading("In Rust"), listing(
                "rust",
                "Island::new(\"x-echo\", fallback)\n  .props(props)\n  .events(vec![\"echo\".to_string()])\n  .size(IslandSize { aspect: Some(\"16:7\".into()), ..IslandSize::default() })",
            )])
            .id("rust"))),
        ],
    )
}
