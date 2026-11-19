use crate::guard::{Rule, Severity};

pub(super) const RULE: Rule = Rule {
    id: "explore/sent-differs",
    severity: Severity::Error,
    since: 1,
    what: "the renderer sent other actions than the screen declares for the step",
    fix: "Send the action from the block that declares it; an app view posts through the `act` it is handed.",
};
