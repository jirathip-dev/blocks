use crate::guard::{Rule, Severity};

pub(super) const RULE: Rule = Rule {
    id: "render/tap-target",
    severity: Severity::Error,
    since: 2,
    what: "a control under 44 by 44 px; a link inside running text is exempt",
    fix: "Give the control at least 44 px each way: use the kind's own button, or drop the app rule that shrinks it.",
};
