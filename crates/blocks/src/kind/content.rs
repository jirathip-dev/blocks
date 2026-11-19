use serde::{Deserialize, Serialize};

use super::{Act, Fallback, Fields, Gesture, Mark, MarkKind};
use crate::expr::Expr;

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

wire! {
    /// A link of a site's bar.
    pub struct NavLink {
        label: String,
        href: String,
        current: Option<bool>,
    }
}

wire! {
    /// The box an island holds before it loads: a width and height, or an aspect.
    pub struct IslandSize {
        width: Option<u32>,
        height: Option<u32>,
        aspect: Option<String>,
    }
}

kind! {
    /// Text as a tree of headings, paragraphs, lists, quotes and code.
    pub struct Prose {
        id: Option<String>,
        parts: Vec<Part>,
    }
}

kind! {
    /// A picture or a video of a known size.
    pub struct Media {
        id: Option<String>,
        src: String,
        alt: String,
        width: u32,
        height: u32,
        video: Option<bool>,
        poster: Option<String>,
        caption: Option<String>,
        marks: Option<Vec<Mark>>,
        tools: Option<Vec<MarkKind>>,
        draw: Option<Gesture>,
        #[serde(rename = "move")]
        moves: Option<Gesture>,
        stretch: Option<Gesture>,
        remove: Option<Gesture>,
    }
}

kind! {
    /// A page's opening: a title, a line, a picture and its actions.
    pub struct Hero {
        id: Option<String>,
        title: String,
        subtitle: Option<String>,
        media: Option<Media>,
        actions: Option<Vec<Act>>,
    }
}

kind! {
    /// A site's link bar.
    pub struct Nav {
        id: Option<String>,
        brand: Option<NavLink>,
        links: Vec<NavLink>,
    }
}

kind! {
    /// A client component the app hosts: its props in, its named events out.
    pub struct Island {
        id: Option<String>,
        name: String,
        fallback: Fallback,
        props: Option<Fields>,
        events: Option<Vec<String>>,
        size: Option<IslandSize>,
    }
}
