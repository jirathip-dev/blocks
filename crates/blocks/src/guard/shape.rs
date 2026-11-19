use serde::{Deserialize, Serialize};

/// How a finding counts: an error fails when it is new, a warning is printed and never fails.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Error,
    Warn,
}

/// One row of the rule table: `<engine>/<name>`, its severity, the guard version that added it, what fires it and the fix.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Rule {
    pub id: &'static str,
    pub severity: Severity,
    pub since: u16,
    pub what: &'static str,
    pub fix: &'static str,
}

impl Rule {
    pub(crate) fn saw(&self, at: &str, detail: impl Into<String>) -> Seen {
        Seen {
            rule: self.id.into(),
            at: at.into(),
            detail: detail.into(),
            ..Seen::default()
        }
    }
}

/// What a rule or a probe measured, with no severity and no fix: only `guard::finding` makes a `Finding`.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct Seen {
    pub rule: String,
    pub at: String,
    pub detail: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub line: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub run: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub shot: Option<String>,
}

/// A rule's verdict on one block of one file, carrying the rule's fix.
#[non_exhaustive]
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct Finding {
    pub rule: String,
    pub severity: Severity,
    pub file: String,
    pub at: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub line: Option<u32>,
    pub message: String,
    pub fix: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub steps: Option<String>,
}
