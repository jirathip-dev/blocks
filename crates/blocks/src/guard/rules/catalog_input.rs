use crate::guard::cx::{list, text, Cx};
use crate::guard::{Rule, Seen, Severity};

pub(super) const RULE: Rule = Rule {
    id: "catalog/input",
    severity: Severity::Error,
    since: 4,
    what: "a form field of a type its catalog entry does not list",
    fix: "Use only the field types the finding lists for this form.",
};

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    for (c, b) in cx.held().filter(|(_, b)| b.kind == "form" || b.kind == "config") {
        let Some(allow) = c.kinds.get(b.kind) else { continue };
        let inputs = &allow.inputs;
        let types = list(b.o, "fields").map(|f| text(f, "type").unwrap_or_default());
        let bad: Vec<&str> = types.filter(|t| !inputs.iter().any(|i| i == t)).collect();
        let takes = if inputs.is_empty() {
            "no field".into()
        } else {
            inputs.join(", ")
        };
        out.extend(
            bad.into_iter()
                .map(|t| RULE.saw(&b.at, format!("`{t}`; a form here takes: {takes}"))),
        );
    }
}
