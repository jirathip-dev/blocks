use crate::guard::{Rule, Severity};

pub(super) const RULE: Rule = Rule {
    id: "explore/unstable",
    severity: Severity::Error,
    since: 1,
    what: "the answerer gave another answer to the same walk",
    fix: "Make the answerer a function of its seed and the actions so far.",
};
