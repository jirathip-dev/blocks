use crate::guard::{Rule, Severity};

pub(super) const RULE: Rule = Rule {
    id: "render/console",
    severity: Severity::Error,
    since: 1,
    what: "a console error or an uncaught exception",
    fix: "Fix the script error; the message is in the finding.",
};
