use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::kind::{Act, Block, Figure, Shown, Tap, Time, Tone};

listed! { 40: Glance(Glance) = "glance" }

wire! {
    /// One side of the closed island: a figure, a short text, or both.
    pub struct GlanceSide {
        figure: Option<Figure>,
        text: Option<Shown>,
        tone: Option<Tone>,
    }
}

wire! {
    /// One row of a glance: a thing that runs or waits, and its value.
    pub struct GlanceRow {
        title: String,
        subtitle: Option<String>,
        figure: Option<Figure>,
        value: Option<Shown>,
        tone: Option<Tone>,
        tap: Option<Tap>,
    }
}

wire! {
    /// What a roomy form draws under the head: rows or a line, a foot and its acts.
    pub struct GlanceBody {
        line: Option<String>,
        rows: Option<Vec<GlanceRow>>,
        foot: Option<String>,
        acts: Option<Vec<Act>>,
    }
}

kind! {
    /// What an island and a widget show of one thing: a head every form draws from, and each form's own part.
    pub struct Glance {
        id: Option<String>,
        title: String,
        subtitle: Option<String>,
        figure: Option<Figure>,
        value: Option<Shown>,
        tone: Option<Tone>,
        tap: Option<Tap>,
        leading: Option<GlanceSide>,
        trailing: Option<GlanceSide>,
        expanded: Option<GlanceBody>,
        small: Option<GlanceBody>,
        medium: Option<GlanceBody>,
    }
}

fn since(at: &str) -> Shown {
    Shown::Time(Time {
        since: Some(at.into()),
        ..Time::default()
    })
}

fn row(title: &str, subtitle: &str, at: &str, thread: &str) -> GlanceRow {
    GlanceRow {
        title: title.into(),
        subtitle: Some(subtitle.into()),
        figure: Some(Figure {
            state: Some(Tone::Working),
            ..Figure::default()
        }),
        value: Some(since(at)),
        tone: Some(Tone::Working),
        tap: Some(Tap {
            thread: Some(thread.into()),
            ..Tap::default()
        }),
    }
}

pub(super) fn sample() -> Vec<Block> {
    let stop = Act {
        label: "Stop".into(),
        action: Some("stop".into()),
        values: Some([("thread".to_string(), Value::from("t-42"))].into_iter().collect()),
        tone: Some(Tone::Bad),
        ..Act::default()
    };
    let open = Act {
        label: "Open".into(),
        tap: Some(Tap {
            thread: Some("t-42".into()),
            ..Tap::default()
        }),
        ..Act::default()
    };
    let turn = Glance::new("Ana")
        .id("turn")
        .subtitle("Order sync")
        .figure(Figure {
            avatar: Some("ana".into()),
            state: Some(Tone::Working),
            ..Figure::default()
        })
        .value(since("2026-11-25T09:41:00Z"))
        .tone(Tone::Working)
        .tap(Tap {
            thread: Some("t-42".into()),
            ..Tap::default()
        })
        .leading(GlanceSide {
            figure: Some(Figure {
                avatar: Some("ana".into()),
                state: Some(Tone::Working),
                ..Figure::default()
            }),
            ..GlanceSide::default()
        })
        .trailing(GlanceSide {
            text: Some("ask".into()),
            tone: Some(Tone::Bad),
            ..GlanceSide::default()
        })
        .expanded(GlanceBody {
            line: Some("cargo test -p orders".into()),
            foot: Some("working · 3 tools".into()),
            acts: Some(vec![stop, open.clone()]),
            ..GlanceBody::default()
        })
        .medium(GlanceBody {
            rows: Some(vec![
                row("Run the order tests", "orders", "2026-11-25T09:41:00Z", "t-42"),
                row("Read the sync log", "sync", "2026-11-25T09:44:00Z", "t-43"),
            ]),
            foot: Some("working · 3 tools".into()),
            acts: Some(vec![open]),
            ..GlanceBody::default()
        })
        .small(GlanceBody {
            line: Some("cargo test -p orders".into()),
            foot: Some("3 tools".into()),
            ..GlanceBody::default()
        });
    let needs = Glance::new("Needs you")
        .id("needs")
        .figure(Figure {
            state: Some(Tone::Needs),
            ..Figure::default()
        })
        .value(Shown::Number(2.into()))
        .tone(Tone::Needs)
        .tap(Tap {
            open: Some("needs".into()),
            ..Tap::default()
        })
        .medium(GlanceBody {
            rows: Some(vec![
                GlanceRow {
                    tone: Some(Tone::Needs),
                    ..row("Approve the deploy", "orders", "2026-11-25T09:30:00Z", "t-40")
                },
                GlanceRow {
                    tone: Some(Tone::Needs),
                    ..row("Pick a schema name", "billing", "2026-11-25T09:12:00Z", "t-39")
                },
            ]),
            foot: Some("2 threads wait".into()),
            ..GlanceBody::default()
        })
        .small(GlanceBody {
            line: Some("Approve the deploy".into()),
            foot: Some("2 threads wait".into()),
            ..GlanceBody::default()
        });
    let bare = Glance::new("Builds").id("bare").value("4 running");
    vec![
        Block::Glance(Box::new(turn)),
        Block::Glance(Box::new(needs)),
        Block::Glance(Box::new(bare)),
    ]
}
