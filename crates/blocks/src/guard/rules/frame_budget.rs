use crate::guard::{Rule, Severity};

pub(super) const RULE: Rule = Rule {
    id: "render/frame-budget",
    severity: Severity::Warn,
    since: 1,
    what: "first paint over 300 ms, or a frame over 16.7 ms",
    fix: "Draw fewer blocks at first: page the list, or fold the rest.",
};
