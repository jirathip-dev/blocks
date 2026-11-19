use crate::guard::{Rule, Severity};

pub(super) const RULE: Rule = Rule {
    id: "render/clipped-text",
    severity: Severity::Error,
    since: 2,
    what: "text is cut by its box with no ellipsis",
    fix: "Let the text wrap, or shorten it.",
};
