use crate::guard::cx::{acts, sends, Cx};
use crate::guard::{Rule, Seen, Severity};
pub(super) const RULE: Rule = Rule {
    id: "lint/actions-many",
    severity: Severity::Warn,
    since: 1,
    what: "more than 12 actions on a screen, the rows' own not counted",
    fix: "Move the rare actions into a `menu` or a sheet.",
};

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    let blocks = cx.blocks.iter().filter(|b| b.kind != "row");
    let all = blocks.flat_map(|b| acts(b.o).into_iter().chain([b.o]));
    let n = all.filter(|o| sends(o).is_some()).count();
    if let Some(root) = cx.blocks.first().filter(|_| n > 12) {
        out.push(RULE.saw(&root.at, format!("{n} actions")));
    }
}
