use std::collections::HashSet;
use std::fmt;

use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::kind::{Block, Fields, Lane, Round, TableRow, Toast};
use crate::SCHEMA_VERSION;

/// What an `insert` adds: a block, a scene's lane, a row's round or a table's row.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(untagged)]
pub enum Child {
    Block(Block),
    Lane(Box<Lane>),
    Round(Box<Round>),
    TableRow(Box<TableRow>),
}

/// One edit to a screen; a block is named by its id.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(tag = "op", rename_all = "lowercase")]
pub enum Op {
    Merge {
        id: String,
        fields: Fields,
    },
    Insert {
        into: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        before: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        after: Option<String>,
        block: Child,
    },
    Move {
        id: String,
        into: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        before: Option<String>,
    },
    Remove {
        id: String,
    },
    Replace {
        id: String,
        block: Block,
    },
    Badge {
        count: u64,
    },
    Dot {
        on: bool,
    },
    Screen {
        screen: Block,
    },
    #[serde(other)]
    #[cfg_attr(feature = "schema", schemars(skip))]
    Unknown,
}

/// What a client sends when a control is used: the screen, the block, the action and its values.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct Action {
    pub screen: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub block: Option<String>,
    pub action: String,
    #[serde(default, skip_serializing_if = "Fields::is_empty")]
    pub values: Fields,
}

/// A server's answer to an action: ops on the screen, a toast, close the sheet or open a screen.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct Answer {
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub ops: Vec<Op>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub toast: Option<Toast>,
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub close: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub open: Option<String>,
}

/// The stream's first event: the version it runs at, the stream's id, the server's epoch and its key limit.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct Hello {
    pub v: u8,
    pub sid: String,
    pub epoch: String,
    pub keys: usize,
}

/// One key's change: ops that apply only on rev `from`, or with no `from` the whole screen.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct Frame {
    pub k: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub from: Option<u64>,
    pub rev: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ops: Option<Vec<Op>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub screen: Option<Block>,
}

/// The stream's last event, and why it ends.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct Bye {
    pub why: Why,
}

/// Why a stream was ended by the server.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(rename_all = "lowercase")]
pub enum Why {
    Evicted,
    Unpaired,
    Handover,
}

/// A client's request: the keys to open, each with the rev it holds, and the keys to close.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct Sync {
    pub open: Vec<Have>,
    #[serde(default)]
    pub close: Vec<String>,
}

/// A key a client opens, with the rev of its copy when that copy came from the same epoch.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct Have {
    pub k: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rev: Option<u64>,
}

/// The server's answer to a `Sync`: one state per key opened.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct Synced {
    pub keys: Vec<KeyState>,
}

/// A key as the server holds it: current (rev only), the ops since the rev sent, the whole screen, or gone.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct KeyState {
    pub k: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rev: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ops: Option<Vec<Op>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub screen: Option<Block>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub gone: Option<u16>,
}

/// A frame of the old per-screen stream, `{"seq", "ops"}`, as cooee reads it today.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct OldFrame {
    pub seq: u64,
    pub ops: Vec<Op>,
}

/// The ops the old per-screen stream sends for `ops`: a `move` becomes a `replace` of its parent, of the root a `screen`.
pub fn old(ops: Vec<Op>, new: &Block) -> Vec<Op> {
    let mut replaced = HashSet::new();
    let mut out = Vec::with_capacity(ops.len());
    for op in ops {
        match op {
            Op::Move { into, .. } if replaced.insert(into.clone()) => match new.get(&into) {
                Some(b) if new.id() != Some(into.as_str()) => out.push(Op::Replace {
                    id: into,
                    block: b.clone(),
                }),
                _ => return vec![Op::Screen { screen: new.clone() }],
            },
            Op::Move { .. } => {}
            Op::Insert { ref into, .. } if replaced.contains(into) => {}
            other => out.push(other),
        }
    }
    out
}

/// A body's encoding; `Cbor` or `MsgPack` would be one more variant.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Format {
    Json,
}

/// The format and the version as one media type: `application/vnd.blocks+json;v=1`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct MediaType {
    pub format: Format,
    pub v: u8,
}

/// Which side must be updated before two versions can talk.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Outdated {
    App,
    Server,
}

impl fmt::Display for Outdated {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::App => "update the app",
            Self::Server => "update the server",
        })
    }
}

impl std::error::Error for Outdated {}

/// A body that does not read or write in its format.
#[derive(Debug)]
pub struct Broken(pub String);

impl fmt::Display for Broken {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "a broken body: {}", self.0)
    }
}

impl std::error::Error for Broken {}

impl From<serde_json::Error> for Broken {
    fn from(e: serde_json::Error) -> Self {
        Self(e.to_string())
    }
}

impl Action {
    /// A static page's `<form>` post: `_screen`, `_block` and `_action`, every other field a string value.
    pub fn from_form(body: &str) -> Result<Action, Broken> {
        let mut a = Action::default();
        let (mut screen, mut action) = (None, None);
        for pair in body.split('&').filter(|p| !p.is_empty()) {
            let (k, v) = pair.split_once('=').unwrap_or((pair, ""));
            let (k, v) = (form_text(k)?, form_text(v)?);
            match k.as_str() {
                "_screen" => screen = Some(v),
                "_block" => a.block = Some(v).filter(|b| !b.is_empty()),
                "_action" => action = Some(v),
                _ => drop(a.values.insert(k, Value::String(v))),
            }
        }
        a.screen = screen.ok_or_else(|| Broken("a form post without _screen".into()))?;
        a.action = action
            .filter(|x| !x.is_empty())
            .ok_or_else(|| Broken("a form post without _action".into()))?;
        Ok(a)
    }
}

fn form_text(s: &str) -> Result<String, Broken> {
    let mut out = Vec::with_capacity(s.len());
    let mut bytes = s.bytes();
    while let Some(b) = bytes.next() {
        out.push(match b {
            b'+' => b' ',
            b'%' => {
                let hex = |b: Option<u8>| b.and_then(|b| char::from(b).to_digit(16));
                let (hi, lo) = hex(bytes.next())
                    .zip(hex(bytes.next()))
                    .ok_or_else(|| Broken("a bad % escape".into()))?;
                u8::try_from(hi * 16 + lo).map_err(|e| Broken(e.to_string()))?
            }
            b => b,
        });
    }
    String::from_utf8(out).map_err(|e| Broken(e.to_string()))
}

impl MediaType {
    /// The media type to answer an `Accept` value with; `application/json`, `*/*` or nothing reads as JSON, v current.
    pub fn pick(offered: &str) -> Result<Self, Outdated> {
        let mut err = None;
        for range in offered.split(',') {
            let mut parts = range.split(';').map(str::trim);
            let kind = parts.next().unwrap_or_default();
            if kind != "application/vnd.blocks+json" {
                continue;
            }
            let v = parts
                .find_map(|p| p.strip_prefix("v="))
                .and_then(|v| v.parse().ok())
                .unwrap_or(SCHEMA_VERSION);
            if v == 0 || v.saturating_add(1) < SCHEMA_VERSION {
                err = Some(Outdated::App);
            } else if v > SCHEMA_VERSION.saturating_add(1) {
                err = Some(Outdated::Server);
            } else {
                return Ok(Self {
                    format: Format::Json,
                    v: v.min(SCHEMA_VERSION),
                });
            }
        }
        err.map_or(
            Ok(Self {
                format: Format::Json,
                v: SCHEMA_VERSION,
            }),
            Err,
        )
    }

    /// `value` in this format and version: one version behind, an answer's toast is its plain text.
    pub fn write<T: Serialize>(&self, value: &T) -> Result<Vec<u8>, Broken> {
        if self.v >= SCHEMA_VERSION {
            return match self.format {
                Format::Json => Ok(serde_json::to_vec(value)?),
            };
        }
        let mut v = serde_json::to_value(value)?;
        if let Some(t) = v.get_mut("toast").filter(|t| t.is_object()) {
            let text = t.get("title").and_then(Value::as_str).filter(|s| !s.is_empty());
            *t = Value::from(text.unwrap_or("Done"));
        }
        match self.format {
            Format::Json => Ok(serde_json::to_vec(&v)?),
        }
    }

    /// A body in this format and version.
    pub fn read<T: DeserializeOwned>(&self, bytes: &[u8]) -> Result<T, Broken> {
        match self.format {
            Format::Json => Ok(serde_json::from_slice(bytes)?),
        }
    }
}

impl fmt::Display for MediaType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self.format {
            Format::Json => write!(f, "application/vnd.blocks+json;v={}", self.v),
        }
    }
}
