use crate::guard::{Rule, Severity};

pub(super) const RULE: Rule = Rule {
    id: "explore/error-screen",
    severity: Severity::Error,
    since: 1,
    what: "an answer is an error, its ops do not apply, or the screen they give has a fault",
    fix: "Answer with ops that apply to the screen as it is; `Built::check` the result.",
};
