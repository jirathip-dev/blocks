use crate::guard::cx::{long, text, Cx};
use crate::guard::{Rule, Seen, Severity};
pub(super) const RULE: Rule = Rule {
    id: "lint/summary-long",
    severity: Severity::Warn,
    since: 3,
    what: "a tool's summary over 80 characters",
    fix: "Keep one line that says what it did; put the output in `body`.",
};

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    let tools = cx.blocks.iter().filter(|b| b.kind == "tool");
    out.extend(tools.filter_map(|b| Some(RULE.saw(&b.at, long(text(b.o, "summary")?, 80)?))));
}
