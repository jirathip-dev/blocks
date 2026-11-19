use serde::{Deserialize, Serialize};

use crate::kind::{Block, Fields, Lane, Round};

/// What an `insert` adds: a block, or a scene's lane or a row's round.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(untagged)]
pub enum Child {
    Block(Block),
    Lane(Box<Lane>),
    Round(Box<Round>),
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
    pub toast: Option<String>,
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub close: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub open: Option<String>,
}
