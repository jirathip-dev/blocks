mod cx;
mod rules;
mod shape;

pub use rules::RULES;
pub use shape::{Finding, Rule, Seen, Severity};

use crate::built::Built;

/// The guard version: it moves with any new rule or tighter limit.
pub const VERSION: u16 = 1;

/// The table row of rule `id`.
pub fn rule(id: &str) -> Option<&'static Rule> {
    RULES.iter().copied().find(|r| r.id == id)
}

/// What `Built::check` and the `lint/` rules see on `screen`, given the app's own kinds.
pub fn lint(screen: &Built, app: &[&str]) -> Vec<Seen> {
    let cx = cx::Cx::new(screen, app);
    let mut out = vec![];
    for check in rules::CHECKS {
        check(&cx, &mut out);
    }
    out
}

/// The finding `seen` makes in `fixture`, with its rule's severity and fix; `None` when no rule has its id.
pub fn finding(seen: Seen, fixture: &str) -> Option<Finding> {
    let r = rule(&seen.rule)?;
    let message = match seen.detail.as_str() {
        "" => r.what.into(),
        d => format!("{}: {d}", r.what),
    };
    Some(Finding {
        rule: seen.rule,
        severity: r.severity,
        file: seen.file.unwrap_or_else(|| fixture.into()),
        at: seen.at,
        line: seen.line.or(Some(1)),
        message,
        fix: r.fix.into(),
        steps: None,
    })
}
