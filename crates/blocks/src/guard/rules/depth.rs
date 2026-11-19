use crate::guard::cx::Cx;
use crate::guard::{Rule, Seen, Severity};
pub(super) const RULE: Rule = Rule {
    id: "lint/depth",
    severity: Severity::Error,
    since: 1,
    what: "blocks nested deeper than 6",
    fix: "Flatten it: open the inner part as a sheet or a screen of its own with `tap.open`.",
};

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    let deep = cx.blocks.iter().filter(|b| b.depth == 7);
    out.extend(deep.map(|b| RULE.saw(&b.at, "7 levels deep")));
}
