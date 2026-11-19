use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};

use crate::tree::Step;

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

/// Why an ignore is there: an empty reason does not parse, so an ignore with no reason does not load.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(try_from = "String", into = "String")]
pub struct Reason(String);

impl TryFrom<String> for Reason {
    type Error = &'static str;
    fn try_from(s: String) -> Result<Self, Self::Error> {
        if s.trim().is_empty() {
            Err("an ignore needs a reason")
        } else {
            Ok(Reason(s))
        }
    }
}

impl From<Reason> for String {
    fn from(r: Reason) -> String {
        r.0
    }
}

/// A hand-written waiver of one rule at one block, or under a prefix ending in `/*`, with its reason.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Ignore {
    pub rule: String,
    pub at: String,
    pub reason: Reason,
}

impl Ignore {
    pub(crate) fn covers(&self, f: &Finding) -> bool {
        self.rule == f.rule
            && match self.at.strip_suffix("/*") {
                Some(p) => f.at.strip_prefix(p).is_some_and(|rest| rest.starts_with('/')),
                None => self.at == f.at,
            }
    }
}

/// One finding a baseline holds: its rule and its block.
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Known {
    pub rule: String,
    pub at: String,
}

/// A fixture's known errors, written only by `tighten`, with the guard version it was written at.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Baseline {
    pub guard: u16,
    pub known: Vec<Known>,
}

/// `.blocks/guard.json`: the screens, the app's kinds, its CSS and scripts, the harnesses that draw them, the inputs that redraw all, explore's answerer and the skill's examples.
#[derive(Clone, Debug, Default, PartialEq, Eq, Deserialize)]
#[serde(deny_unknown_fields, default)]
pub struct Config {
    pub screens: Vec<String>,
    pub kinds: Vec<String>,
    pub css: Vec<String>,
    pub scripts: Vec<String>,
    pub harness: Vec<Vec<String>>,
    pub inputs: Vec<String>,
    pub answer: Option<Vec<String>>,
    pub examples: Vec<String>,
}

/// What a harness draws: each run in one process, its shots under `<out>/<run>/` and every `Seen` in `<out>/seen.json`.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema))]
pub struct Plan {
    pub out: String,
    pub runs: Vec<Run>,
}

/// One screen drawn at one size with the app's CSS, scripts and kinds; the probes run when `probes` is set.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(schemars::JsonSchema), schemars(rename = "PlanRun"))]
pub struct Run {
    pub name: String,
    pub screen: String,
    pub size: String,
    pub css: Vec<String>,
    pub scripts: Vec<String>,
    pub kinds: Vec<String>,
    pub steps: Vec<Step>,
    pub probes: bool,
}

/// What an app holds against its findings, by fixture name: ignores, baselines, and in a PR base's baselines and fixtures.
#[derive(Clone, Debug, Default)]
pub struct Held {
    pub ignores: BTreeMap<String, Vec<Ignore>>,
    pub baselines: BTreeMap<String, Baseline>,
    pub base: Option<BTreeMap<String, Baseline>>,
    pub on_base: BTreeSet<String>,
}

/// The fixtures judged, name to path, what was not judged with why, and whether a harness drew them.
#[derive(Clone, Debug, Default)]
pub struct Scope {
    pub fixtures: BTreeMap<String, String>,
    pub skipped: Vec<String>,
    pub rendered: bool,
}

/// A finding an ignore covers, with the ignore's reason.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct Ignored {
    #[serde(flatten)]
    pub finding: Finding,
    pub reason: String,
}

/// One check's verdict: it passes when `new` is empty.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct Outcome {
    pub guard: u16,
    pub pass: bool,
    pub new: Vec<Finding>,
    pub warned: Vec<Finding>,
    pub known: Vec<Finding>,
    pub ignored: Vec<Ignored>,
    pub checked: Vec<String>,
    pub skipped: Vec<String>,
}
