use crate::guard::cx::Cx;
use crate::guard::{Rule, Seen, Severity};

pub(super) const RULE: Rule = Rule {
    id: "catalog/size",
    severity: Severity::Error,
    since: 4,
    what: "more blocks than its catalog's `max.blocks`",
    fix: "Say it in fewer blocks.",
};

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    let n = cx.held().count();
    let over = cx.catalog.filter(|c| n > c.max.blocks);
    let root = cx.blocks.first().map(|b| b.at.as_str()).unwrap_or_default();
    out.extend(over.map(|c| RULE.saw(root, format!("{n} blocks; at most {}", c.max.blocks))));
}
