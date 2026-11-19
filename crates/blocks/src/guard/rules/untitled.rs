use crate::guard::cx::{text, Cx};
use crate::guard::{Rule, Seen, Severity};
pub(super) const RULE: Rule = Rule {
    id: "lint/untitled",
    severity: Severity::Warn,
    since: 1,
    what: "a screen with no title",
    fix: "Give the screen a title of one to three words.",
};

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    let root = cx.blocks.first();
    if let Some(r) = root.filter(|r| text(r.o, "title").is_none_or(|t| t.trim().is_empty())) {
        out.push(RULE.saw(&r.at, ""));
    }
}
