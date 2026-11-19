use crate::guard::{Rule, Severity};

pub(super) const RULE: Rule = Rule {
    id: "render/overlap",
    severity: Severity::Error,
    since: 1,
    what: "two sibling blocks cover each other",
    fix: "Remove the app rule that positions the block; let the layout place it.",
};
