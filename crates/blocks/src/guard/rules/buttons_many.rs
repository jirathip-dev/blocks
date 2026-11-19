use crate::guard::cx::Cx;
use crate::guard::{Rule, Seen, Severity};
pub(super) const RULE: Rule = Rule {
    id: "lint/buttons-many",
    severity: Severity::Error,
    since: 1,
    what: "more than 3 buttons in one group",
    fix: "Keep up to three; move the rest into a `menu`.",
};

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    for b in &cx.blocks {
        let n = cx.kids(b).filter(|k| k.kind == "button").count();
        if n > 3 {
            out.push(RULE.saw(&b.at, format!("{n} buttons")));
        }
    }
}
