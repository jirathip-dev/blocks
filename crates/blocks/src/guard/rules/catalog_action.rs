use crate::guard::cx::{each, Cx};
use crate::guard::{Rule, Seen, Severity};

pub(super) const RULE: Rule = Rule {
    id: "catalog/action",
    severity: Severity::Error,
    since: 4,
    what: "an action its kind's catalog entry does not list",
    fix: "Send only an action the finding lists for this kind, spelt as written, or none.",
};

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    for (c, b) in cx.held() {
        let Some(allow) = c.kinds.get(b.kind) else { continue };
        let listed = &allow.actions;
        let mut bad = vec![];
        each(b.o, &mut |_, k, v| {
            let a = v.as_str().filter(|a| k == "action" && !listed.iter().any(|x| x == a));
            bad.extend(a.map(String::from));
        });
        let may = if listed.is_empty() {
            "nothing".into()
        } else {
            listed.join(", ")
        };
        out.extend(
            bad.into_iter()
                .map(|a| RULE.saw(&b.at, format!("`{a}`; this kind may send: {may}"))),
        );
    }
}
