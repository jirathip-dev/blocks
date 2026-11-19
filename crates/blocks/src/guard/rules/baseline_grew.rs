use crate::guard::{Rule, Severity};

pub(super) const RULE: Rule = Rule {
    id: "guard/baseline-grew",
    severity: Severity::Error,
    since: 1,
    what: "a baseline gained an entry for a rule older than the file",
    fix: "Fix the finding, or add an ignore with a reason.",
};
