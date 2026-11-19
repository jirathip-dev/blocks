use crate::guard::cx::Cx;
use crate::guard::{Rule, Seen, Severity};
pub(super) const RULE: Rule = Rule {
    id: "lint/level-blocks",
    severity: Severity::Warn,
    since: 1,
    what: "more than 12 blocks in one level, rows not counted",
    fix: "Group them into sections, or split the screen.",
};

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    for b in &cx.blocks {
        let n = cx.kids(b).filter(|k| k.kind != "row").count();
        if n > 12 {
            out.push(RULE.saw(&b.at, format!("{n} blocks")));
        }
    }
}
