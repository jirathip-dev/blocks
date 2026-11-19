use std::collections::BTreeMap;
use std::path::Path;

use serde_json::{Map, Number, Value};

use super::Files;
use crate::{
    site, theme, tree, Block, Built, Card, Child, Composer, ComposerChip, Diagram, List, Node, OldFrame, Op, Queued,
    Row, Screen, Tap, Text, Tone,
};

pub(super) fn files(root: &Path, _: &Value) -> std::io::Result<Files> {
    let sample = serde_json::to_string_pretty(&sample())?;
    let mut out: Files = vec![
        ("schema/sample.json".into(), format!("{sample}\n")),
        (
            "web/src/gen/sample.ts".into(),
            format!("import type {{ OldFrame }} from \"./types.ts\";\n\nexport const sample: OldFrame[] = {sample};\n"),
        ),
    ];
    for (kind, b) in crate::samples() {
        let text = serde_json::to_string_pretty(&b)? + "\n";
        out.push((format!("fixtures/blocks/{kind}.json"), text));
    }
    out.extend(trees(root)?);
    out.extend(html(root)?);
    Ok(out)
}

fn html(root: &Path) -> std::io::Result<Files> {
    let mut out = vec![];
    for (kind, b) in crate::samples() {
        let text = site::fragment(&Built::new(serde_json::to_value(&b)?), "/act") + "\n";
        out.push((format!("fixtures/html/{kind}.html"), text));
    }
    let style = serde_json::from_str(&std::fs::read_to_string(root.join("fixtures/styles/still.json"))?)?;
    let look = site::Look {
        schemes: theme::default().clone(),
        style,
    };
    let screen = Built::of(&site_screen());
    let live = site::Live {
        js: "/blocks.js",
        stream: "/stream",
        looks: &[],
    };
    for (file, live) in [("index.html", None), ("live.html", Some(live))] {
        let head = site::Head {
            title: "Blocks",
            description: "One shape, three renderers",
            canonical: "https://blocks.test/",
            image: Some("/og.png"),
            lang: "en",
        };
        let s = site::Site {
            head,
            look: &look,
            css: &["/blocks.css"],
            action: "/act",
            live,
        };
        out.push((format!("fixtures/site/{file}"), site::page(&screen, &s) + "\n"));
    }
    Ok(out)
}

fn site_screen() -> Screen {
    let on = ["nav", "hero", "prose", "media", "form"];
    let mut blocks: Vec<Block> = crate::samples()
        .into_iter()
        .filter(|(k, _)| on.contains(k))
        .map(|(_, b)| b)
        .collect();
    blocks.push(Block::Diagram(Box::new(workflow())));
    Screen::new().id("site").title("Blocks").blocks(blocks)
}

fn workflow() -> Diagram {
    let source = "[*] --> queued\nqueued --> impl\nimpl --> review\nstate \"in review\" as review\nreview --> fix\nfix --> review\nreview --> ready\nimpl --> ready\nready --> merged\nqueued --> blocked\nstate stall\nimpl --> stall";
    let counts = [
        ("queued", 3),
        ("impl", 2),
        ("review", 1),
        ("fix", 0),
        ("ready", 1),
        ("merged", 9),
        ("blocked", 1),
    ];
    let node = |state: Option<Tone>, limit: Option<&str>| Node {
        state,
        limit: limit.map(String::from),
        value: limit.map(|_| "45m".into()),
        tap: Some(Tap {
            open: Some("/settings".into()),
            ..Tap::default()
        }),
        ..Node::default()
    };
    let nodes = [
        ("impl", node(Some(Tone::Working), None)),
        ("blocked", node(Some(Tone::Needs), None)),
        ("stall", node(None, Some("stall_minutes"))),
    ];
    Diagram::new(source)
        .id("workflow")
        .title("Workflow")
        .selected("review")
        .counts(
            counts
                .map(|(k, n)| (k.to_string(), Number::from(n)))
                .into_iter()
                .collect::<BTreeMap<_, _>>(),
        )
        .nodes(
            nodes
                .map(|(k, n)| (k.to_string(), n))
                .into_iter()
                .collect::<BTreeMap<_, _>>(),
        )
}

const SWIFT_FALLBACKS: [&str; 6] = ["composer", "prose", "hero", "media", "nav", "island"];

fn trees(root: &Path) -> std::io::Result<Files> {
    let web = super::kinds::native(root)?;
    let swift: Vec<&str> = Block::KINDS
        .iter()
        .copied()
        .filter(|k| !SWIFT_FALLBACKS.contains(k))
        .collect();
    let mut out = expected("fixtures/trees", &web)?;
    out.extend(expected("fixtures/trees/swift", &swift)?);
    Ok(out)
}

fn expected(dir: &str, kinds: &[&str]) -> std::io::Result<Files> {
    let mut out = vec![];
    for (kind, b) in crate::samples() {
        let v = serde_json::to_value(&b)?;
        let state = v
            .get("state")
            .cloned()
            .map(serde_json::from_value)
            .transpose()?
            .unwrap_or_default();
        let t = tree::expect(&Built::new(v), kinds, &state);
        let text = serde_json::to_string_pretty(&t)? + "\n";
        out.push((format!("{dir}/{kind}.json"), text));
    }
    Ok(out)
}

fn row(id: &str, title: &str) -> Block {
    Block::Row(Box::new(Row {
        id: Some(id.into()),
        title: title.into(),
        ..Row::default()
    }))
}

fn sample() -> Vec<OldFrame> {
    let say = Composer {
        id: Some("say".into()),
        action: "thread-say".into(),
        placeholder: Some("message the orchestrator".into()),
        chips: Some(vec![ComposerChip {
            name: "effort".into(),
            cur: None,
            all: vec!["low".into(), "high".into()],
        }]),
        queued: Some(vec![Queued {
            q: 1,
            text: "and the tests".into(),
        }]),
        ..Composer::default()
    };
    let note = Text {
        id: Some("note".into()),
        markdown: Some("**Hello**".into()),
        ..Text::default()
    };
    let list = List {
        id: Some("l".into()),
        rows: vec![row("a", "first"), row("b", "second")],
        ..List::default()
    };
    let screen = Screen {
        id: Some("s".into()),
        title: Some("Thread".into()),
        blocks: Some(vec![
            Block::Text(Box::new(note)),
            Block::List(Box::new(list)),
            Block::Composer(Box::new(say)),
        ]),
        ..Screen::default()
    };
    let card = Card {
        id: Some("c".into()),
        tone: Some(Tone::Warn),
        title: Some("q1".into()),
        ..Card::default()
    };
    let insert = |before: Option<&str>, after: Option<&str>, b: Block| Op::Insert {
        into: "l".into(),
        before: before.map(Into::into),
        after: after.map(Into::into),
        block: Child::Block(b),
    };
    let fields = Map::from_iter([("subtitle".into(), Value::String("now".into()))]);
    let ops = vec![
        insert(Some("a"), None, row("c", "before a")),
        insert(None, Some("a"), row("d", "after a")),
        Op::Merge { id: "b".into(), fields },
        Op::Move {
            id: "b".into(),
            into: "l".into(),
            before: Some("c".into()),
        },
        Op::Replace {
            id: "note".into(),
            block: Block::Card(Box::new(card)),
        },
        Op::Remove { id: "d".into() },
        Op::Badge { count: 2 },
        Op::Dot { on: true },
    ];
    vec![
        OldFrame {
            seq: 0,
            ops: vec![Op::Screen {
                screen: Block::Screen(Box::new(screen)),
            }],
        },
        OldFrame { seq: 1, ops },
    ]
}
