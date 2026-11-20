use serde::{Deserialize, Serialize};

use crate::kind::Block;

listed! { 23: Prose(Prose) = "prose" }

wire! {
    /// A run of text and how it is set.
    pub struct Span {
        text: String,
        bold: Option<bool>,
        italic: Option<bool>,
        code: Option<bool>,
        link: Option<String>,
    }
}

/// One part of a prose tree.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(tag = "part", rename_all = "kebab-case")]
pub enum Part {
    Heading {
        level: u8,
        spans: Vec<Span>,
    },
    Para {
        spans: Vec<Span>,
    },
    List {
        ordered: bool,
        items: Vec<Vec<Span>>,
    },
    Quote {
        spans: Vec<Span>,
    },
    Code {
        #[serde(default, skip_serializing_if = "Option::is_none")]
        lang: Option<String>,
        text: String,
    },
    Rule,
}

kind! {
    /// Text as a tree of headings, paragraphs, lists, quotes and code.
    pub struct Prose {
        id: Option<String>,
        parts: Vec<Part>,
    }
}

fn span(text: &str) -> Span {
    Span {
        text: text.into(),
        ..Span::default()
    }
}

pub(super) fn sample() -> Vec<Block> {
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
    vec![Block::Prose(Box::new(prose.id("about")))]
}
