use crate::guard::{Rule, Severity};

pub(super) const RULE: Rule = Rule {
    id: "css/motion",
    severity: Severity::Error,
    since: 1,
    what: "a transition or keyframe of anything but `transform` and `opacity`",
    fix: "Animate `transform` or `opacity` only.",
};
