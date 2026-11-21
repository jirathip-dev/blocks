use crate::guard::cx::Cx;
use crate::guard::{Rule, Seen, Severity};
pub(super) const RULE: Rule = Rule {
    id: "lint/stream-no-id",
    severity: Severity::Error,
    since: 3,
    what: "a message, a tool, or a prose with `streaming`, that has no id",
    fix: "Give it an `id`: ops reach a block by its id, and without one each change replaces its parent.",
};

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    for b in cx.blocks.iter().filter(|b| !b.o.contains_key("id")) {
        let streams = b.kind == "prose" && b.o.get("streaming").is_some_and(|s| s.as_bool() == Some(true));
        if matches!(b.kind, "message" | "tool") || streams {
            out.push(RULE.saw(&b.at, format!("a {} with no id", b.kind)));
        }
    }
}
