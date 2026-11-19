use crate::guard::{Rule, Severity};

pub(super) const RULE: Rule = Rule {
    id: "render/tree",
    severity: Severity::Error,
    since: 1,
    what: "the drawn tree is not the one the crate expects: a block missing, or a fallback where a view was expected",
    fix: "Register the kind's view, or send a kind this renderer draws.",
};
