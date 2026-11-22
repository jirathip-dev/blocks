use std::collections::BTreeMap;

use serde::Deserialize;
use serde_json::Value;

use crate::kind::{samples, Block, Field};

/// The fields no catalog offers: ids, fallbacks and local state are the reader's, `Built`'s and the app's.
pub const NEVER: &[&str] = &["type", "id", "fallback", "show", "enabled", "checks", "set"];

/// What a host lets a model write: read from the host's own JSON file, never sent to a client.
#[non_exhaustive]
#[derive(Clone, Debug, PartialEq, Eq, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Catalog {
    pub name: String,
    pub kinds: BTreeMap<String, Allow>,
    #[serde(default)]
    pub links: Vec<String>,
    #[serde(default)]
    pub media: Vec<String>,
    #[serde(default)]
    pub max: Max,
    #[serde(default)]
    pub example: Option<Value>,
}

/// One kind's entry: the fields a model may write, the actions a block of it may send, a form's field types.
#[derive(Clone, Debug, Default, PartialEq, Eq, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct Allow {
    pub fields: Option<Vec<String>>,
    pub actions: Vec<String>,
    pub inputs: Vec<String>,
}

/// The most a reply may hold: 40 blocks and 16,000 characters unless the file says otherwise.
#[derive(Clone, Debug, PartialEq, Eq, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct Max {
    pub blocks: usize,
    pub chars: usize,
}

impl Default for Max {
    fn default() -> Self {
        Max {
            blocks: 40,
            chars: 16_000,
        }
    }
}

fn has(kind: &str, field: &str) -> bool {
    let sample = samples().into_iter().find(|(k, _)| *k == kind);
    let Some(Value::Object(mut o)) = sample.and_then(|(_, b)| serde_json::to_value(b).ok()) else {
        return false;
    };
    o.insert(field.into(), Value::Null);
    Block::read(kind, Value::Object(o)).map_or(true, |b| b.more().is_none_or(|m| !m.contains_key(field)))
}

fn entry(kind: &str, allow: &Allow) -> Result<(), String> {
    if !Block::KINDS.contains(&kind) {
        return Err(format!("`{kind}` is no core kind"));
    }
    for f in allow.fields.iter().flatten() {
        if NEVER.contains(&f.as_str()) {
            return Err(format!("`{kind}`: `{f}` is never offered to a model"));
        }
        if !has(kind, f) {
            return Err(format!("`{kind}` has no field `{f}`"));
        }
    }
    if !allow.inputs.is_empty() && kind != "form" && kind != "config" {
        return Err(format!("`{kind}` takes no inputs: only a form or a config does"));
    }
    match allow.inputs.iter().find(|i| !Field::TYPES.contains(&i.as_str())) {
        Some(i) => Err(format!("`{kind}`: `{i}` is no field type")),
        None => Ok(()),
    }
}

impl Catalog {
    /// The catalog in `json`, or why it does not load.
    pub fn read(json: &str) -> Result<Catalog, String> {
        let c: Catalog = serde_json::from_str(json).map_err(|e| e.to_string())?;
        for (kind, allow) in &c.kinds {
            entry(kind, allow)?;
        }
        let open = c
            .links
            .iter()
            .chain(&c.media)
            .find(|s| !s.ends_with('/') && !s.ends_with(':'));
        match open {
            Some(s) => Err(format!("`{s}` must end in `/` or `:`")),
            None => Ok(c),
        }
    }

    /// Whether any kind of the catalog may send `action`.
    pub fn sends(&self, action: &str) -> bool {
        self.kinds.values().any(|a| a.actions.iter().any(|x| x == action))
    }
}
