use crate::guard::{Rule, Severity};

pub(super) const RULE: Rule = Rule {
    id: "css/fixed-width",
    severity: Severity::Error,
    since: 2,
    what: "a `width` or `min-width` over 390 px",
    fix: "Use `max-width`, or a width in `%`.",
};
