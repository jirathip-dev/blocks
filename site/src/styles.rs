use blocks::site::Look;
use blocks::{Block, ButtonStyle, Card, ChipOption, Chips, List, Prose, Section, Tone};
use serde_json::Value;

use crate::pages::panel;
use crate::ui::{b, code, heading, listing, marked, page, para, row, section, span, text, Page};

type Named = (&'static str, &'static str, Look);

fn plain(v: Option<&Value>) -> String {
    match v {
        Some(Value::String(s)) => s.clone(),
        Some(v) => v.to_string(),
        None => String::new(),
    }
}

fn labels(all: Option<&Value>) -> String {
    let all: Vec<String> = all
        .and_then(Value::as_object)
        .into_iter()
        .flatten()
        .map(|(role, l)| {
            let at = |k: &str| plain(l.get(k));
            format!("{role}: {}…{} {}", at("prefix"), at("suffix"), at("case"))
        })
        .collect();
    if all.is_empty() {
        "as is".into()
    } else {
        all.join(" · ")
    }
}

fn value(axis: &str, l: &Look) -> String {
    let s = serde_json::to_value(&l.style).unwrap_or_default();
    match axis {
        "colour" => format!(
            "accent {} · {}",
            l.schemes.light.tokens.l.as_str(),
            l.schemes.dark.tokens.l.as_str()
        ),
        "space" | "radius" => format!("× {}", plain(s.get(axis))),
        "motion" => format!("× {} · {}", plain(s.get("motion")), plain(s.get("easing"))),
        "labels" => labels(s.get("labels")),
        _ => plain(s.get(axis)),
    }
}

fn button(id: &str, label: &str, style: ButtonStyle) -> Block {
    b!(Button(blocks::Button::new(label).id(id).style(style)))
}

fn chips(id: &str) -> Block {
    let chip = |v: &str| ChipOption {
        value: v.into(),
        label: v.into(),
    };
    b!(Chips(
        Chips::new(id, vec![chip("open"), chip("closed")])
            .id(id)
            .selected(vec!["open".to_string()])
    ))
}

fn rows(id: &str) -> Block {
    let all = [
        ("api", "build 812", "2 min"),
        ("web", "build 811", "9 min"),
        ("docs", "build 810", "1 h"),
    ];
    let rows = all
        .map(|(t, s, v)| b!(Row(row(&format!("{id}-{t}"), t, s, v))))
        .to_vec();
    b!(List(List::new(rows).id(id)))
}

fn sample(axis: &str, looks: &[Named]) -> Vec<Block> {
    let id = |s: &str| format!("{axis}-{s}");
    match axis {
        "colour" => vec![section(
            "panels",
            "",
            looks.iter().map(|(n, label, _)| panel(n, label)).collect(),
        )],
        "type" => vec![b!(Prose(
            Prose::new(vec![
                heading("Build log, Tuesday"),
                para(vec![span("Three builds ran; one waits on you. 1,284 ms.")])
            ])
            .id(id("prose"))
        ))],
        "space" => vec![rows(&id("rows"))],
        "radius" => vec![
            button(&id("save"), "save", ButtonStyle::Primary),
            button(&id("cancel"), "cancel", ButtonStyle::Plain),
            chips(&id("chips")),
        ],
        "motion" => vec![text(
            &id("rule"),
            "Each enter and settle runs its duration times **motion**, on the look's easing curve, and moves only `transform` and `opacity`. At 0, and under reduced motion, nothing moves.",
        )],
        "surface" => vec![b!(Card(
            Card::new()
                .id(id("card"))
                .title("Deploy to staging")
                .subtitle("waiting on review")
        ))],
        "fills" => vec![button(&id("approve"), "approve", ButtonStyle::Primary), chips(&id("chips"))],
        "marks" => vec![b!(List(
            List::new(vec![
                marked(&id("done"), "build 812", "", "", Tone::Done),
                marked(&id("needs"), "build 811", "", "", Tone::Needs),
                marked(&id("fail"), "build 810", "", "", Tone::Fail),
            ])
            .id(id("rows"))
        ))],
        "sections" => vec![section(&id("today"), "Today", vec![rows(&id("rows"))])],
        _ => vec![
            section(&id("recent"), "Recent", vec![button(&id("retry"), "retry", ButtonStyle::Plain)]),
            chips(&id("chips")),
        ],
    }
}

const AXES: [(&str, &str, &str); 10] = [
    ("colour", "Colour", "The 19 colour tokens, once for light and once for dark; the device picks which. Each pair passes `theme::gate`."),
    ("type", "Type", "The font design every label is set in."),
    ("space", "Space", "A multiplier of the paddings and gaps."),
    ("radius", "Radius", "A multiplier of the corner radius; 0 is square."),
    ("motion", "Motion", "A multiplier of every duration, and the curve it runs on; 0 is none."),
    ("surface", "Surface", "How a card's surface is drawn."),
    ("fills", "Fills", "How a tinted part is filled: the primary action, the picked chip."),
    ("marks", "Marks", "Whether a state mark is a symbol or its word."),
    ("sections", "Sections", "How a section's header shows: a title, or quiet."),
    ("labels", "Labels", "A case and up to 4 marks before or after a role's label."),
];

fn axis(looks: &[Named], (key, title, what): (&str, &str, &str)) -> Block {
    let values: Vec<Block> = looks
        .iter()
        .map(|(n, label, l)| b!(Row(row(&format!("{key}-is-{n}"), label, "", &value(key, l)))))
        .collect();
    let blocks = [
        vec![text(&format!("{key}-what"), what)],
        sample(key, looks),
        vec![b!(List(List::new(values).id(format!("{key}-values"))))],
    ]
    .concat();
    b!(Section(Section::new(blocks).id(format!("axis-{key}")).header(title)))
}

/// The Styles page: each axis of a look, a sample of it in the look worn, and its value in all four.
pub fn styles(looks: &[Named]) -> Page {
    let paper = looks.iter().find(|(n, _, _)| *n == "paper").map(|(_, _, l)| l);
    let json = serde_json::to_string_pretty(&paper).unwrap_or_default();
    let own = Prose::new(vec![
        heading("Bring your own"),
        para(vec![
            span("A look is a scheme pair and a "),
            code("Style"),
            span(", defined by the app; these four are this site's own. "),
            code("theme::gate"),
            span(" checks each scheme's contrast and colour distance, and this site's build runs it on all eight. Paper, as the page is handed it:"),
        ]),
        listing("json", &json),
    ])
    .id("own");
    let body = [
        vec![text(
            "intro",
            "A look is a light and a dark scheme plus a `Style`. Pick one in the nav: every page changes in place and keeps it. The device picks light or dark. Each sample below wears the look you picked; its list gives the value in all four.",
        )],
        AXES.iter().map(|a| axis(looks, *a)).collect(),
        vec![b!(Prose(own))],
    ]
    .concat();
    page(
        "styles",
        "styles.html",
        "Styles",
        "Four looks, each a scheme pair and a style: every axis, a sample of it, and its value in each look.",
        body,
    )
}
