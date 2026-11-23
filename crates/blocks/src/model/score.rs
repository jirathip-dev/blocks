use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::catalog::Catalog;
use crate::kind::Block;

/// One eval case: the catalog it uses, what the user asked, what any good answer holds and one reply that does.
#[derive(Clone, Debug, PartialEq, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Case {
    pub catalog: String,
    pub ask: String,
    pub expect: Expect,
    pub gold: Value,
}

/// What any good answer holds: these kinds, these actions sent, these words shown, at most this many blocks.
#[derive(Clone, Debug, Default, PartialEq, Eq, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct Expect {
    pub kinds: Vec<String>,
    pub actions: Vec<String>,
    pub says: Vec<String>,
    pub blocks: Option<usize>,
}

/// One case's marks for one set of replies.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize)]
pub struct Score {
    pub fit: bool,
    pub retry: bool,
    pub fell: bool,
    pub mends: usize,
    pub warns: usize,
    pub meets: bool,
    pub chars: usize,
}

fn walk(v: &Value, kinds: &mut Vec<String>, actions: &mut Vec<String>, text: &mut String) {
    match v {
        Value::Object(o) => {
            for (k, x) in o {
                match (k.as_str(), x.as_str()) {
                    ("type", Some(s)) => kinds.push(s.into()),
                    ("action", Some(s)) => actions.push(s.into()),
                    _ => {}
                }
                walk(x, kinds, actions, text);
            }
        }
        Value::Array(l) => l.iter().for_each(|x| walk(x, kinds, actions, text)),
        Value::String(s) => {
            text.push_str(&s.to_lowercase());
            text.push('\n');
        }
        _ => {}
    }
}

impl Expect {
    /// Whether `blocks` hold every kind, action and word named, in at most `blocks` top-level blocks.
    pub fn held(&self, blocks: &[Block]) -> bool {
        let (mut kinds, mut actions, mut text) = (vec![], vec![], String::new());
        walk(
            &serde_json::to_value(blocks).unwrap_or_default(),
            &mut kinds,
            &mut actions,
            &mut text,
        );
        self.kinds.iter().all(|k| kinds.contains(k))
            && self.actions.iter().all(|a| actions.contains(a))
            && self.says.iter().all(|w| text.contains(&w.to_lowercase()))
            && self.blocks.is_none_or(|n| blocks.len() <= n)
    }
}

/// The marks for a `first` reply and, when it is refused, the `second` that answered its `say()`.
pub fn score(catalog: &Catalog, expect: &Expect, first: &str, second: Option<&str>) -> Score {
    let (fit, drawn, text) = match (super::read(catalog, "eval", first), second) {
        (Ok(f), _) => (true, Some(f), first),
        (Err(_), Some(s)) => (false, super::read(catalog, "eval", s).ok(), s),
        (Err(_), None) => (false, None, first),
    };
    Score {
        fit,
        retry: !fit && drawn.is_some(),
        fell: drawn.is_none(),
        mends: drawn.as_ref().map_or(0, |d| d.mends.len()),
        warns: drawn.as_ref().map_or(0, |d| d.warned.len()),
        meets: drawn.is_some_and(|d| expect.held(&d.blocks)),
        chars: text.chars().count(),
    }
}
