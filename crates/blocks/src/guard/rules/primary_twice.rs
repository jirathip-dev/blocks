use crate::guard::cx::{text, Cx, Node};
use crate::guard::{Rule, Seen, Severity};

pub(super) const RULE: Rule = Rule {
    id: "lint/primary-twice",
    severity: Severity::Error,
    since: 1,
    what: "two primary buttons among one block's children, or one at the top of a screen that has done",
    fix: "Keep one primary action in a group; make the others `plain`.",
};

fn primary(b: &Node) -> bool {
    b.kind == "button" && text(b.o, "style") == Some("primary")
}

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    for b in &cx.blocks {
        let n = cx.kids(b).filter(|k| primary(k)).count();
        if n > 1 {
            out.push(RULE.saw(&b.at, format!("{n} primary buttons")));
        }
    }
    let done = cx.blocks.first().filter(|r| r.o.contains_key("done"));
    for b in done.into_iter().flat_map(|r| cx.kids(r)).filter(|k| primary(k)) {
        out.push(RULE.saw(&b.at, "a primary button beside done"));
    }
}
