use crate::guard::cx::Cx;
use crate::guard::{Rule, Seen, Severity};

pub(super) const RULE: Rule = Rule {
    id: "catalog/kind",
    severity: Severity::Error,
    since: 4,
    what: "a block of a kind its catalog does not name",
    fix: "Use only the kinds the catalog names, listed in the finding.",
};

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    for (c, b) in cx.held().filter(|(c, b)| !c.kinds.contains_key(b.kind)) {
        let kinds: Vec<&str> = c.kinds.keys().map(String::as_str).collect();
        out.push(RULE.saw(&b.at, format!("`{}`; use only: {}", b.kind, kinds.join(", "))));
    }
}
