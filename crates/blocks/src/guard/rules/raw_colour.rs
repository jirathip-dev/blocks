use crate::guard::{Rule, Severity};

pub(super) const RULE: Rule = Rule {
    id: "css/raw-colour",
    severity: Severity::Error,
    since: 2,
    what: "an app colour property set to anything but a scheme token (`var(--fg)`, `var(--card)`, …), `currentColor`, `transparent` or `inherit`",
    fix: "Use the scheme token for that role, or add the colour to the app's scheme so the gate checks it.",
};
