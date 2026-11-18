use serde::{Deserialize, Serialize};

/// The rows a device draws, top to bottom; each row id is unique.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct Screen {
    pub rows: Vec<Row>,
}

/// One row: a stable id and the block it draws.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct Row {
    pub id: String,
    pub block: Block,
}

/// What a row draws.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(rename_all = "snake_case")]
pub enum Block {
    Text { text: String },
    Button { label: String, action: String },
}
