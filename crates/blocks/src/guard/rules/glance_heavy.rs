use crate::guard::cx::Cx;
use crate::guard::{Rule, Seen, Severity};
pub(super) const RULE: Rule = Rule {
    id: "lint/glance-heavy",
    severity: Severity::Warn,
    since: 5,
    what: "a glance whose JSON is over 3,000 bytes",
    fix: "Send fewer rows or shorter lines: a Live Activity's state is at most 4 KB, and a form draws two rows.",
};

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    let glances = cx.blocks.iter().filter(|b| b.kind == "glance");
    let sized = glances.map(|b| (b, serde_json::to_vec(b.o).map_or(0, |j| j.len())));
    out.extend(
        sized
            .filter(|(_, n)| *n > 3000)
            .map(|(b, n)| RULE.saw(&b.at, format!("{n} bytes"))),
    );
}
