use crate::guard::cx::{acts, list, long, text, Cx};
use crate::guard::{Rule, Seen, Severity};
pub(super) const RULE: Rule = Rule {
    id: "lint/label-long",
    severity: Severity::Error,
    since: 1,
    what: "a button, act or chip label over 30 characters, or a badge over 20",
    fix: "Shorten it to a verb and its object; move the rest to a `confirm` or a `text` block.",
};

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    for b in &cx.blocks {
        let mut labels: Vec<&str> = acts(b.o).into_iter().filter_map(|a| text(a, "label")).collect();
        match b.kind {
            "button" => labels.extend(text(b.o, "label")),
            "chips" => labels.extend(list(b.o, "options").filter_map(|o| text(o, "label"))),
            _ => {}
        }
        out.extend(
            labels
                .into_iter()
                .filter_map(|l| long(l, 30))
                .map(|d| RULE.saw(&b.at, d)),
        );
        let badge = b.o.get("badge").and_then(|x| x.get("text")?.as_str());
        if let Some(d) = badge.and_then(|s| long(s, 20)) {
            out.push(RULE.saw(&b.at, format!("a badge of {d}")));
        }
    }
}
