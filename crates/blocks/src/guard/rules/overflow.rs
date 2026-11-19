use crate::guard::{Rule, Severity};

pub(super) const RULE: Rule = Rule {
    id: "render/overflow",
    severity: Severity::Error,
    since: 2,
    what: "a block leaves the 390 px width, or the page scrolls sideways",
    fix: "Let the block wrap: remove the fixed width or the unbroken text that holds it open.",
};
