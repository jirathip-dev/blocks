use crate::guard::{Rule, Severity};

pub(super) const RULE: Rule = Rule {
    id: "render/no-size",
    severity: Severity::Error,
    since: 2,
    what: "a drawn block has no width or no height",
    fix: "Give the block content, or hide it with `show`.",
};
