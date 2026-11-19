use crate::guard::{Rule, Severity};

pub(super) const RULE: Rule = Rule {
    id: "render/no-name",
    severity: Severity::Error,
    since: 2,
    what: "an actionable element or image with no accessible name",
    fix: "Give it a label, or an `alt` for an image.",
};
