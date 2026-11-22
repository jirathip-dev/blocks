mod close;
mod mend;

use serde::Serialize;
use serde_json::{Map, Value};

use crate::built::Built;
use crate::catalog::Catalog;
use crate::guard::{self, Severity};
use crate::kind::{Block, Fields, Part, Prose};
use crate::wire::Action;

/// What a model's reply holds once read: its blocks, the mends made, the guard's warnings, and whether it was cut.
#[derive(Clone, Debug, PartialEq)]
pub struct Fit {
    pub blocks: Vec<Block>,
    pub mends: Vec<Mend>,
    pub warned: Vec<Wrong>,
    pub cut: bool,
}

/// Why a reply is not drawn: its errors, and what it said for `plain`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Refusal {
    pub errors: Vec<Wrong>,
    pub cut: bool,
    lines: Vec<String>,
}

/// One thing wrong: its rule, where in the model's own JSON (`blocks[1].buttons[0]`), the kind, and the line to say.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct Wrong {
    pub rule: String,
    pub at: String,
    pub kind: String,
    pub say: String,
}

/// One mend the reader made, with where.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(tag = "mend", rename_all = "kebab-case")]
pub enum Mend {
    Around,
    Closed,
    Root,
    Dropped { at: String, field: String },
    Cut { at: String },
}

impl Wrong {
    fn new(rule: &str, at: &str, kind: &str, say: String) -> Wrong {
        Wrong {
            rule: rule.into(),
            at: at.into(),
            kind: kind.into(),
            say,
        }
    }
}

const KEPT: [&str; 12] = [
    "action",
    "values",
    "confirm",
    "destructive",
    "url",
    "href",
    "link",
    "src",
    "avatar",
    "poster",
    "type",
    "style",
];

const TEXT: [&str; 13] = [
    "title", "subtitle", "label", "question", "header", "text", "markdown", "message", "body", "value", "caption",
    "empty", "alt",
];

impl Refusal {
    fn new(errors: Vec<Wrong>, cut: bool, lines: Vec<String>) -> Refusal {
        Refusal { errors, cut, lines }
    }

    /// The errors as text for the model: at most 6 lines, each under 160 characters.
    pub fn say(&self) -> String {
        let n = self.errors.len();
        let s = if n == 1 { "" } else { "s" };
        let mut out = vec![format!(
            "Not drawn: {n} problem{s}. Send the whole JSON again with these fixed."
        )];
        for (i, w) in self.errors.iter().take(5).enumerate() {
            let line = match w.at.as_str() {
                "" => format!("{}. {}", i + 1, w.say),
                at => format!("{}. {at} ({}): {}", i + 1, w.kind, w.say),
            };
            out.push(line.chars().take(159).collect());
        }
        out.join("\n")
    }

    /// What the reply said, as one prose block of plain lines: no action, no link, no file.
    pub fn plain(&self, prefix: &str) -> Block {
        let mut parts = Prose::read(&self.lines.join("\n\n"));
        for p in &mut parts {
            let spans: Vec<_> = match p {
                Part::Heading { spans, .. } | Part::Para { spans } | Part::Quote { spans } => vec![spans],
                Part::List { items, .. } => items.iter_mut().collect(),
                Part::Code { .. } | Part::Rule => vec![],
            };
            spans.into_iter().flatten().for_each(|s| s.link = None);
        }
        Block::Prose(Box::new(Prose::new(parts).id(format!("{prefix}.0"))))
    }
}

fn sends(v: &Value, out: &mut Vec<(String, Value)>) {
    match v {
        Value::Object(o) => {
            let prose = o.get("type").is_some_and(|t| t == "prose");
            for (k, x) in o {
                if let (true, "markdown", Some(md)) = (prose, k.as_str(), x.as_str()) {
                    sends(&serde_json::to_value(Prose::read(md)).unwrap_or_default(), out);
                }
                if KEPT.contains(&k.as_str()) && !x.is_null() && (k != "style" || x == "destructive") {
                    out.push((k.clone(), x.clone()));
                }
                sends(x, out);
            }
        }
        Value::Array(l) => l.iter().for_each(|x| sends(x, out)),
        _ => {}
    }
}

fn lines(v: &Value, out: &mut Vec<String>) {
    match v {
        Value::Object(o) => {
            out.extend(TEXT.iter().filter_map(|k| o.get(*k)?.as_str()).map(String::from));
            o.iter()
                .filter(|(k, x)| !TEXT.contains(&k.as_str()) || !x.is_string())
                .for_each(|(_, x)| lines(x, out));
        }
        Value::Array(l) => l.iter().for_each(|x| lines(x, out)),
        _ => {}
    }
}

fn refuse(rule: &str, say: &str, cut: bool, lines: Vec<String>) -> Refusal {
    Refusal::new(vec![Wrong::new(rule, "", "", say.into())], cut, lines)
}

fn root(found: close::Found) -> (Vec<Value>, Fields, Vec<Mend>) {
    let mut mends = vec![];
    mends.extend(found.around.then_some(Mend::Around));
    mends.extend(found.closed.then_some(Mend::Closed));
    let (mut raw, depth, extra) = match found.value {
        Value::Object(mut o) if o.get("blocks").is_some_and(Value::is_array) => {
            let list = o.remove("blocks").and_then(|l| l.as_array().cloned());
            (list.unwrap_or_default(), 2, o)
        }
        Value::Array(l) => (l, 1, Map::new()),
        v => (vec![v], 0, Map::new()),
    };
    if depth < 2 {
        mends.push(Mend::Root);
    }
    if found.cut && found.open > depth && raw.pop().is_some() {
        mends.push(Mend::Cut {
            at: format!("blocks[{}]", raw.len()),
        });
    }
    (raw, extra, mends)
}

fn check(m: &mend::Mender, raw: Vec<Value>) -> (Vec<Wrong>, Vec<Wrong>) {
    let mut screen = Fields::new();
    for (k, v) in [("type", "screen"), ("id", m.prefix), ("title", "Reply")] {
        screen.insert(k.into(), Value::String(v.into()));
    }
    screen.insert("blocks".into(), Value::Array(raw));
    let (mut errors, mut warned) = (vec![], vec![]);
    for s in guard::lint_in(&Built::new(Value::Object(screen)), m.catalog) {
        let Some(r) = guard::rule(&s.rule) else { continue };
        let id = s.at.rsplit('/').next().and_then(|l| l.split_once('#'));
        let (at, kind) = id.and_then(|(_, id)| m.places.get(id)).cloned().unwrap_or_default();
        let say = match s.detail.as_str() {
            "" => r.fix.to_string(),
            d => format!("{d}. {}", r.fix),
        };
        match r.severity {
            Severity::Error => errors.push(Wrong::new(&s.rule, &at, &kind, say)),
            Severity::Warn if s.at.contains('/') => warned.push(Wrong::new(&s.rule, &at, &kind, say)),
            Severity::Warn => {}
        }
    }
    (errors, warned)
}

fn typed(raw: Vec<Value>) -> Result<Vec<Block>, Vec<Wrong>> {
    let mut blocks = vec![];
    for (i, v) in raw.into_iter().enumerate() {
        let kind = v.get("type").and_then(Value::as_str).unwrap_or_default().to_string();
        let b = Block::read(&kind, v)
            .map_err(|e| vec![Wrong::new("lint/fault", &format!("blocks[{i}]"), &kind, e.to_string())]);
        blocks.push(b?);
    }
    Ok(blocks)
}

/// A model's `text` as checked blocks under `catalog`, their ids written under `prefix`; or why not.
pub fn read(catalog: &Catalog, prefix: &str, text: &str) -> Result<Fit, Refusal> {
    let n = text.chars().count();
    if n > catalog.max.chars {
        let say = format!("{n} characters; at most {}. Say it in fewer words.", catalog.max.chars);
        return Err(refuse("read/size", &say, false, vec![text.into()]));
    }
    let Some(found) = close::find(text) else {
        let say = "No JSON found. Reply with one JSON object {\"blocks\": [...]} and nothing else.";
        return Err(refuse("read/json", say, false, vec![text.into()]));
    };
    let cut = found.cut;
    let (mut raw, extra, mut mends) = root(found);
    let mut said = vec![];
    lines(&Value::Array(raw.clone()), &mut said);
    if raw.is_empty() && !cut {
        let say = "The reply holds no block: write at least one in \"blocks\".";
        return Err(refuse("read/empty", say, cut, said));
    }
    let mut wrote = vec![];
    sends(&Value::Array(raw.clone()), &mut wrote);
    sends(&Value::Object(extra.clone()), &mut wrote);
    mends.extend(extra.into_iter().map(|(field, _)| Mend::Dropped {
        at: String::new(),
        field,
    }));
    let mut m = mend::Mender {
        catalog,
        prefix,
        n: 0,
        places: std::collections::BTreeMap::new(),
        mends: vec![],
        faults: vec![],
    };
    for (i, b) in raw.iter_mut().enumerate() {
        m.block(b, &format!("blocks[{i}]"));
    }
    mends.append(&mut m.mends);
    if !m.faults.is_empty() {
        return Err(Refusal::new(m.faults, cut, said));
    }
    let (errors, warned) = check(&m, raw.clone());
    if !errors.is_empty() {
        return Err(Refusal::new(errors, cut, said));
    }
    let blocks = typed(raw).map_err(|e| Refusal::new(e, cut, said.clone()))?;
    let mut kept = vec![];
    sends(&serde_json::to_value(&blocks).unwrap_or_default(), &mut kept);
    if kept != wrote {
        let say = "A mend changed what a block sends, opens or loads: send the whole JSON again.";
        return Err(refuse("read/kept", say, cut, said));
    }
    Ok(Fit {
        blocks,
        mends,
        warned,
        cut,
    })
}

/// The values of an action sent from a block under `prefix`, the prefix off their field names.
pub fn own(prefix: &str, action: &Action) -> Option<Fields> {
    let n = action.block.as_deref()?.strip_prefix(prefix)?.strip_prefix('.')?;
    if n.is_empty() || !n.chars().all(|c| c.is_ascii_digit()) {
        return None;
    }
    let head = format!("{prefix}.");
    let values = action.values.iter();
    Some(
        values
            .map(|(k, v)| (k.strip_prefix(&head).unwrap_or(k).to_string(), v.clone()))
            .collect(),
    )
}
