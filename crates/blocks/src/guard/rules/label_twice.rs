use std::collections::{BTreeMap, BTreeSet};

use crate::guard::cx::{acts, sends, text, Cx, Fields};
use crate::guard::{Rule, Seen, Severity};
pub(super) const RULE: Rule = Rule {
    id: "lint/label-twice",
    severity: Severity::Error,
    since: 1,
    what: "two buttons or acts in one group with one label and different actions",
    fix: "Rename one so that each says what it does.",
};

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    for b in &cx.blocks {
        let buttons = cx.kids(b).filter(|k| k.kind == "button").map(|k| k.o);
        let group: Vec<&Fields> = buttons.chain(acts(b.o)).collect();
        let mut by = BTreeMap::new();
        let mut twice = BTreeSet::new();
        for g in group {
            let Some(label) = text(g, "label") else { continue };
            if by.insert(label, sends(g)).is_some_and(|was| was != sends(g)) {
                twice.insert(label);
            }
        }
        out.extend(twice.into_iter().map(|l| RULE.saw(&b.at, l)));
    }
}
