use blocks::expr::{Expr, Lit, Match, Pattern, State};
use blocks::{
    Block, Bound, Button, Check, Fallback, Field, FieldValue, Fields, Form, Island, IslandSize, List, PickerField,
    Prose, Set, Shown, Stat, Tap, TextField, Tile, ToggleField,
};

use crate::ui::{b, heading, listing, page, row, section, text, Page};

fn get(key: &str) -> Expr {
    Expr::Get(key.into())
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
    let email: Field = TextField::new("email")
        .label("Email")
        .value(FieldValue::Text("ada@example.org".into()))
        .placeholder("you@example.org")
        .checks(vec![Check {
            ok: valid.clone(),
            say: "needs a domain after the @".into(),
        }])
        .into();
    let often: Field = PickerField::new("often")
        .label("How often")
        .value(FieldValue::Text("monthly".into()))
        .options(vec!["monthly".to_string(), "weekly".into()])
        .show(get("updates"))
        .into();
    let updates: Field = ToggleField::new("updates")
        .label("Updates")
        .value(FieldValue::Flag(false))
        .into();
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

pub fn streams() -> Page {
    let stream: serde_json::Value =
        serde_json::from_str(include_str!("../../fixtures/plot/stream.json")).unwrap_or_default();
    let frames: Vec<serde_json::Value> = stream["frames"]
        .as_array()
        .into_iter()
        .flatten()
        .map(|f| f["ops"].clone())
        .collect();
    let props: Fields = [
        ("screen".to_string(), stream["start"]["blocks"][0].clone()),
        ("frames".to_string(), serde_json::Value::from(frames)),
    ]
    .into_iter()
    .collect();
    let fallback = Fallback {
        title: "The stream plays with JS".into(),
        subtitle: Some("With JS off, the plot samples are drawn in the gallery".into()),
        tap: None,
    };
    let size = IslandSize {
        aspect: Some("16:7".into()),
        ..IslandSize::default()
    };
    let island = Island::new("x-stream", fallback).id("stream").props(props).size(size);
    let p = page(
        "streams",
        "streams.html",
        "Streams",
        "A plot fed 80 points a second by the points op, drawn once per frame in place: fixtures/plot/stream.json, played in a loop.",
        vec![
            text(
                "intro",
                "Force at 80 samples a second through a 3 s window, as an app's server streams it: each frame is one `points` op that adds the new samples and drops what left the window, and a `merge` when the peak moves. The page applies each frame and draws the plot once per display frame, into the same elements.",
            ),
            b!(Island(island)),
            b!(Prose(Prose::new(vec![heading("In Rust"), listing(
                "rust",
                "if plot.push(\"Force\", seconds, kg) {\n    shelf.put(&key, \"/live\", &screen)?; // diff writes the points op\n}",
            )])
            .id("rust"))),
        ],
    );
    Page { js: "play.js", ..p }
}
