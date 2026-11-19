use crate::guard::{Rule, Severity};

pub(super) const RULE: Rule = Rule {
    id: "render/dropped",
    severity: Severity::Warn,
    since: 2,
    what: "an island sent an event its `events` does not name",
    fix: "Name the event in the island's `events`, or stop sending it.",
};
