use crate::guard::cx::{sends, Cx};
use crate::guard::{Rule, Seen, Severity};
pub(super) const RULE: Rule = Rule {
    id: "lint/action-no-id",
    severity: Severity::Warn,
    since: 1,
    what: "a block that sends an action has no id",
    fix: "Give the block an `id`; tests, the harness and explore find it by id.",
};

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    let bare = cx.blocks.iter().filter(|b| !b.o.contains_key("id"));
    out.extend(bare.filter_map(|b| Some(RULE.saw(&b.at, sends(b.o)?))));
}
