use crate::guard::{Rule, Severity};

pub(super) const RULE: Rule = Rule {
    id: "guard/seed-missing",
    severity: Severity::Warn,
    since: 1,
    what: "a screen with a list has no `empty` fixture, or no `long` one",
    fix: "Add the fixture from the app's fixture writer.",
};
