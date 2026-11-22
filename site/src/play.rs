use blocks::{Block, Built, Fallback, Fields, Island, Nav, NavLink, Screen};
use serde_json::{json, Value};

use crate::ui::{b, open, page, section, Page, REPO};

const SITE: (&str, &str) = ("site/src/kinds.rs", include_str!("kinds.rs"));
macro_rules! core {
    ($kind:literal) => {
        (
            concat!("crates/blocks/src/kind/core/", $kind, ".rs"),
            include_str!(concat!("../../crates/blocks/src/kind/core/", $kind, ".rs")),
        )
    };
}

const CRATE: [(&str, &str); 11] = [
    core!("chart"),
    core!("import"),
    core!("lines"),
    core!("message"),
    core!("modal"),
    core!("table"),
    core!("toast"),
    core!("timeline"),
    core!("tool"),
    core!("sidebar"),
    core!("plot"),
];

/// The lines of a source file that build a block: the whole `fn` its id is written in, numbered from 1.
pub struct Cut {
    pub file: &'static str,
    pub from: usize,
    pub to: usize,
    pub code: String,
}

fn cut_in(file: &'static str, src: &str, id: &str) -> Option<Cut> {
    let lines: Vec<&str> = src.lines().collect();
    let quoted = format!("\"{id}\"");
    let at = [format!(".id({quoted})"), format!("id: {quoted}"), format!("({quoted},")]
        .iter()
        .find_map(|p| lines.iter().position(|l| l.contains(p.as_str())))
        .or_else(|| lines.iter().position(|l| l.trim_start().starts_with(&quoted)))?;
    let from = lines
        .iter()
        .take(at + 1)
        .rposition(|l| ["fn ", "pub fn ", "pub(super) fn "].iter().any(|f| l.starts_with(f)))?;
    let to = from + lines.iter().skip(from).position(|l| *l == "}")?;
    let code = lines.get(from..=to)?.join("\n");
    Some(Cut {
        file,
        from: from + 1,
        to: to + 1,
        code,
    })
}

/// The functions that build a sample's blocks, each once: the crate's `samples()` in its kind's file, the rest in kinds.rs.
pub fn cuts(sample: &[Block]) -> Vec<Cut> {
    let theirs: Vec<Block> = blocks::samples().into_iter().map(|(_, b)| b).collect();
    let mut out: Vec<Cut> = Vec::new();
    for b in sample {
        let files: &[(&'static str, &str)] = if theirs.contains(b) { &CRATE } else { &[SITE] };
        let found = b
            .id()
            .and_then(|id| files.iter().find_map(|(f, src)| cut_in(f, src, id)));
        if let Some(c) = found.filter(|c| !out.iter().any(|o| o.file == c.file && o.from == c.from)) {
            out.push(c);
        }
    }
    out
}

/// A screen's JSON as blocks-site writes it: the wire value, fallbacks in, pretty-printed.
pub fn json(screen: &Screen) -> String {
    serde_json::to_string_pretty(Built::of(screen).value()).unwrap_or_default()
}

/// A kind's sample as a whole screen of its own.
pub fn screen(kind: &str, sample: &[Block]) -> Screen {
    Screen::new().id(kind).blocks(sample.to_vec())
}

/// Where a cut's lines are on GitHub.
pub fn source_url(c: &Cut) -> String {
    format!("{REPO}/blob/main/{}#L{}-L{}", c.file, c.from, c.to)
}

fn sample(name: &str, json: &str, rust: &[Cut]) -> Value {
    let rust: Vec<Value> = rust
        .iter()
        .map(|c| json!({"file": c.file, "from": c.from, "to": c.to, "code": c.code, "url": source_url(c)}))
        .collect();
    json!({"name": name, "json": json, "rust": rust})
}

/// The playground: a picker of home and every kind's sample, then the editor and its live preview.
pub fn playground(home: &Page, all: &[(String, Vec<Block>)]) -> Page {
    let mut samples = vec![sample("home", &json(&home.screen), &[])];
    samples.extend(all.iter().map(|(k, s)| sample(k, &json(&screen(k, s)), &cuts(s))));
    let names = std::iter::once("home").chain(all.iter().map(|(k, _)| k.as_str()));
    let pick = Nav::new(
        names
            .map(|k| NavLink {
                label: k.into(),
                href: format!("playground.html#k={k}"),
                current: None,
            })
            .collect::<Vec<_>>(),
    )
    .id("pick");
    let props: Fields = [
        ("samples".to_string(), Value::Array(samples)),
        (
            "pages".to_string(),
            format!("{REPO}/blob/main/site/src/pages.rs").into(),
        ),
    ]
    .into_iter()
    .collect();
    let fallback = Fallback {
        title: "The playground draws with JS".into(),
        subtitle: Some("With JS off, every sample is drawn in the gallery".into()),
        tap: Some(open("gallery.html")),
    };
    let island = Island::new("x-play", fallback).id("play").props(props);
    let p = page(
        "playground",
        "playground.html",
        "Playground",
        "Edit a screen's JSON and see blocks draw it live, from any gallery sample, with its Rust beside it.",
        vec![section("start", "Start from", vec![b!(Nav(pick))]), b!(Island(island))],
    );
    Page { js: "play.js", ..p }
}
