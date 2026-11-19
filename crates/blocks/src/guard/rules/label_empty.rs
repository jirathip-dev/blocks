use crate::guard::cx::{acts, list, text, Cx, Fields};
use crate::guard::{Rule, Seen, Severity};
pub(super) const RULE: Rule = Rule {
    id: "lint/label-empty",
    severity: Severity::Error,
    since: 1,
    what: "a blank button, act, chip, option or field label, or row title",
    fix: "Give it a label of one to three words.",
};

fn blank(o: &Fields, k: &str) -> bool {
    text(o, k).is_none_or(|s| s.trim().is_empty())
}

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    for b in &cx.blocks {
        let own = match b.kind {
            "button" => blank(b.o, "label").then_some("button label"),
            "row" => blank(b.o, "title").then_some("row title"),
            _ => None,
        };
        let acts = acts(b.o).into_iter().filter(|a| blank(a, "label")).map(|_| "act label");
        let options = list(b.o, "options")
            .filter(|o| blank(o, "label"))
            .map(|_| "option label");
        let fields = list(b.o, "fields").filter(|f| {
            f.get("label")
                .is_some_and(|l| l.as_str().is_some_and(|s| s.trim().is_empty()))
        });
        let all = own
            .into_iter()
            .chain(acts)
            .chain(options)
            .chain(fields.map(|_| "field label"));
        out.extend(all.map(|w| RULE.saw(&b.at, format!("a blank {w}"))));
    }
}
