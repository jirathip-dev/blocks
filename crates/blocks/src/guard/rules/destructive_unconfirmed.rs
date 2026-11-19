use serde_json::Value;

use crate::guard::cx::{acts, sends, text, Cx, Fields};
use crate::guard::{Rule, Seen, Severity};

pub(super) const RULE: Rule = Rule {
    id: "lint/destructive-unconfirmed",
    severity: Severity::Error,
    since: 1,
    what: "a destructive button or act sends an action with no confirm",
    fix: "Add a `confirm` whose title names what is lost.",
};

fn bare(o: &Fields, key: &str, word: &str) -> bool {
    text(o, key) == Some(word) && sends(o).is_some() && o.get("confirm").is_none_or(Value::is_null)
}

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    for b in &cx.blocks {
        if b.kind == "button" && bare(b.o, "style", "destructive") {
            out.push(RULE.saw(&b.at, text(b.o, "label").unwrap_or_default()));
        }
        for a in acts(b.o).into_iter().filter(|a| bare(a, "tone", "bad")) {
            out.push(RULE.saw(&b.at, text(a, "label").unwrap_or_default()));
        }
    }
}
