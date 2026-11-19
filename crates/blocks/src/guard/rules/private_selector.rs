use crate::guard::{Rule, Severity};

pub(super) const RULE: Rule = Rule {
    id: "css/private-selector",
    severity: Severity::Error,
    since: 1,
    what: "an app selector names a `.b-` class that is no generated hook",
    fix: "Style a hook from the renderer contract (`.b-<kind>`, `.b-<kind>__<part>`, `[data-variant]`, `[data-tone]`).",
};
