use crate::guard::cx::Cx;
use crate::guard::{Rule, Seen, Severity};

pub(super) const RULE: Rule = Rule {
    id: "lint/fault",
    severity: Severity::Error,
    since: 1,
    what: "Built::check returns a fault",
    fix: "Build the block with its typed constructor; `Built::check` must return nothing.",
};

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    let faults = cx.screen.check(cx.app);
    out.extend(faults.into_iter().map(|f| RULE.saw("", format!("{f:?}"))));
}
