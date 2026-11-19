use crate::guard::cx::{long, text, Cx};
use crate::guard::{Rule, Seen, Severity};
pub(super) const RULE: Rule = Rule {
    id: "lint/title-long",
    severity: Severity::Error,
    since: 1,
    what: "a title, header or question over 60 characters",
    fix: "Shorten it to 60 characters or fewer; move the detail to `subtitle` or to a `text` block.",
};

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    for b in &cx.blocks {
        let titles = ["title", "header", "question"].into_iter().filter_map(|k| text(b.o, k));
        out.extend(titles.filter_map(|t| long(t, 60)).map(|d| RULE.saw(&b.at, d)));
    }
}
