use crate::guard::cx::{long, text, Cx};
use crate::guard::{Rule, Seen, Severity};
pub(super) const RULE: Rule = Rule {
    id: "lint/text-wall",
    severity: Severity::Warn,
    since: 1,
    what: "a text block's markdown over 600 characters",
    fix: "Use `prose`, or split it under section headers.",
};

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    let texts = cx.blocks.iter().filter(|b| b.kind == "text");
    out.extend(texts.filter_map(|b| Some(RULE.saw(&b.at, long(text(b.o, "markdown")?, 600)?))));
}
