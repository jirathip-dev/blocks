use crate::guard::{Rule, Severity};

pub(super) const RULE: Rule = Rule {
    id: "render/truncated",
    severity: Severity::Warn,
    since: 2,
    what: "a title or label ends in an ellipsis",
    fix: "Shorten it, or let it take two lines.",
};
