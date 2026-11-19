use std::collections::BTreeMap;

use serde::Serialize;

use super::{Finding, Outcome, Severity, RULES, VERSION};

/// An outcome as SARIF 2.1.0: one run of `blocks check`, its rule table and every finding.
#[derive(Clone, Debug, Serialize)]
pub struct Sarif {
    #[serde(rename = "$schema")]
    schema: &'static str,
    version: &'static str,
    runs: Vec<Run>,
}

#[derive(Clone, Debug, Serialize)]
struct Run {
    tool: Tool,
    results: Vec<Res>,
}

#[derive(Clone, Debug, Serialize)]
struct Tool {
    driver: Driver,
}

#[derive(Clone, Debug, Serialize)]
struct Driver {
    name: &'static str,
    version: String,
    rules: Vec<Desc>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Desc {
    id: &'static str,
    short_description: Text,
    help: Text,
    default_configuration: Level,
}

#[derive(Clone, Debug, Serialize)]
struct Text {
    text: String,
}

#[derive(Clone, Debug, Serialize)]
struct Level {
    level: &'static str,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Res {
    rule_id: String,
    level: &'static str,
    message: Text,
    locations: Vec<Loc>,
    partial_fingerprints: BTreeMap<&'static str, String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    baseline_state: Option<&'static str>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    suppressions: Vec<Suppression>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Loc {
    physical_location: Physical,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Physical {
    artifact_location: Uri,
    #[serde(skip_serializing_if = "Option::is_none")]
    region: Option<Region>,
}

#[derive(Clone, Debug, Serialize)]
struct Uri {
    uri: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Region {
    start_line: u32,
}

#[derive(Clone, Debug, Serialize)]
struct Suppression {
    kind: &'static str,
    justification: String,
}

fn level(s: Severity) -> &'static str {
    match s {
        Severity::Error => "error",
        Severity::Warn => "warning",
    }
}

fn result(f: &Finding, state: Option<&'static str>, reason: Option<&str>) -> Res {
    Res {
        rule_id: f.rule.clone(),
        level: level(f.severity),
        message: Text {
            text: format!("{} Fix: {}", f.message, f.fix),
        },
        locations: vec![Loc {
            physical_location: Physical {
                artifact_location: Uri { uri: f.file.clone() },
                region: f.line.map(|start_line| Region { start_line }),
            },
        }],
        partial_fingerprints: BTreeMap::from([("blocks/v1", format!("{}|{}|{}", f.rule, f.file, f.at))]),
        baseline_state: state,
        suppressions: reason
            .map(|r| Suppression {
                kind: "external",
                justification: r.into(),
            })
            .into_iter()
            .collect(),
    }
}

/// The SARIF 2.1.0 log of `outcome`: new and warned findings are `new`, known ones `unchanged`, ignored ones suppressed.
pub fn sarif(outcome: &Outcome) -> Sarif {
    let rules = RULES
        .iter()
        .map(|r| Desc {
            id: r.id,
            short_description: Text { text: r.what.into() },
            help: Text { text: r.fix.into() },
            default_configuration: Level {
                level: level(r.severity),
            },
        })
        .collect();
    let fresh = outcome
        .new
        .iter()
        .chain(&outcome.warned)
        .map(|f| result(f, Some("new"), None));
    let known = outcome.known.iter().map(|f| result(f, Some("unchanged"), None));
    let ignored = outcome
        .ignored
        .iter()
        .map(|i| result(&i.finding, None, Some(&i.reason)));
    Sarif {
        schema: "https://json.schemastore.org/sarif-2.1.0.json",
        version: "2.1.0",
        runs: vec![Run {
            tool: Tool {
                driver: Driver {
                    name: "blocks check",
                    version: VERSION.to_string(),
                    rules,
                },
            },
            results: fresh.chain(known).chain(ignored).collect(),
        }],
    }
}
