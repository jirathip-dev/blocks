use crate::guard::{Rule, Severity};

pub(super) const RULE: Rule = Rule {
    id: "guard/unused-ignore",
    severity: Severity::Error,
    since: 1,
    what: "an ignore matches no finding",
    fix: "Delete the ignore.",
};
