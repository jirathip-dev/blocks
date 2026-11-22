use blocks::{Block, Button, Figure, Nav, NavLink, Part, Row, Screen, Section, Shown, Span, Tap, Text, Tone, Toned};

use crate::looks::NAMES;

pub const REPO: &str = "https://github.com/jirathip-dev/blocks";

macro_rules! b {
    ($k:ident($e:expr)) => {
        blocks::Block::$k(Box::new($e))
    };
}
pub(crate) use b;

pub struct Page {
    pub file: String,
    pub title: String,
    pub description: String,
    pub screen: Screen,
    pub js: &'static str,
}

const LINKS: [(&str, &str); 8] = [
    ("gallery", "gallery.html"),
    ("styles", "styles.html"),
    ("numbers", "numbers.html"),
    ("behaviours", "behaviours.html"),
    ("islands", "islands.html"),
    ("streams", "streams.html"),
    ("layout", "layout.html"),
    ("playground", "playground.html"),
];

fn nav(current: &str) -> Block {
    let link = |label: &str, href: &str| NavLink {
        label: label.into(),
        href: href.into(),
        current: (label == current).then_some(true),
    };
    let mut links: Vec<NavLink> = LINKS.iter().map(|(l, h)| link(l, h)).collect();
    links.push(link("github", REPO));
    let nav = b!(Nav(Nav::new(links).id("site-nav").brand(link("blocks", "index.html"))));
    let looks = NAMES
        .iter()
        .map(|(name, label)| {
            let tap = Tap {
                sheet: Some(format!("look:{name}")),
                ..Tap::default()
            };
            b!(Button(Button::new(*label).id(format!("look-{name}")).tap(tap)))
        })
        .collect();
    section("site-top", "", vec![nav, section("looks", "look", looks)])
}

pub fn page(id: &str, file: &str, title: &str, description: &str, body: Vec<Block>) -> Page {
    let foot = text(
        "foot",
        &format!("Every page here is a blocks `Screen`, written by `site::page`: no hand-written HTML. Source: {REPO}"),
    );
    let blocks = [vec![nav(id)], body, vec![foot]].concat();
    Page {
        file: file.into(),
        title: title.into(),
        description: description.into(),
        screen: Screen::new().id(id).title(title).blocks(blocks),
        js: "blocks.js",
    }
}

pub fn text(id: &str, markdown: &str) -> Block {
    b!(Text(Text::new().id(id).markdown(markdown)))
}

pub fn section(id: &str, header: &str, blocks: Vec<Block>) -> Block {
    let s = Section::new(blocks).id(id);
    b!(Section(if header.is_empty() { s } else { s.header(header) }))
}

pub fn row(id: &str, title: &str, subtitle: &str, value: &str) -> Row {
    let r = Row::new(title).id(id);
    let r = if subtitle.is_empty() {
        r
    } else {
        r.subtitle(Toned::Text(subtitle.into()))
    };
    if value.is_empty() {
        r
    } else {
        r.value(Shown::Text(value.into()))
    }
}

pub fn marked(id: &str, title: &str, subtitle: &str, value: &str, state: Tone) -> Block {
    let f = Figure {
        state: Some(state),
        ..Figure::default()
    };
    b!(Row(row(id, title, subtitle, value).figure(f)))
}

pub fn link_row(id: &str, title: &str, subtitle: &str, value: &str, href: &str) -> Block {
    b!(Row(row(id, title, subtitle, value).tap(open(href))))
}

pub fn open(href: &str) -> Tap {
    Tap {
        open: Some(href.into()),
        ..Tap::default()
    }
}

pub fn url(href: &str) -> Tap {
    Tap {
        url: Some(href.into()),
        ..Tap::default()
    }
}

pub fn span(text: &str) -> Span {
    Span {
        text: text.into(),
        ..Span::default()
    }
}

pub fn bold(text: &str) -> Span {
    Span {
        bold: Some(true),
        ..span(text)
    }
}

pub fn code(text: &str) -> Span {
    Span {
        code: Some(true),
        ..span(text)
    }
}

pub fn heading(text: &str) -> Part {
    Part::Heading {
        level: 2,
        spans: vec![span(text)],
    }
}

pub fn para(spans: Vec<Span>) -> Part {
    Part::Para { spans }
}

pub fn listing(lang: &str, text: &str) -> Part {
    Part::Code {
        lang: Some(lang.into()),
        text: text.into(),
    }
}
