use crate::guard::cx::Cx;
use crate::guard::{Rule, Seen, Severity};

pub(super) const RULE: Rule = Rule {
    id: "lint/empty-state",
    severity: Severity::Error,
    since: 1,
    what: "a list with no rows or a section with no blocks, and no visible text, prose, hero or card beside it",
    fix: "Add a `text` beside it that says what will appear here.",
};

const SAYS: [&str; 4] = ["text", "prose", "hero", "card"];

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    for b in &cx.blocks {
        let empty = matches!(b.kind, "list" | "section") && b.kids.is_empty();
        let said = || {
            let mut beside = cx.parent(b).into_iter().flat_map(|p| cx.kids(p));
            beside.any(|s| !s.hidden && SAYS.contains(&s.kind))
        };
        if empty && !b.hidden && !said() {
            out.push(RULE.saw(&b.at, format!("an empty {}", b.kind)));
        }
    }
}
