use crate::guard::{Rule, Severity};

pub(super) const RULE: Rule = Rule {
    id: "guard/baseline-stale",
    severity: Severity::Error,
    since: 1,
    what: "a baseline entry is no longer found",
    fix: "Run `blocks check --tighten`.",
};
