use crate::guard::{Rule, Severity};

pub(super) const RULE: Rule = Rule {
    id: "explore/unanswered",
    severity: Severity::Error,
    since: 1,
    what: "the answerer gave no answer to an action the screen declares",
    fix: "Handle the action in the app, or remove the control.",
};
