use crate::guard::cx::{list, text, Cx};
use crate::guard::{Rule, Seen, Severity};
pub(super) const RULE: Rule = Rule {
    id: "lint/tap-empty",
    severity: Severity::Error,
    since: 3,
    what: "an attachment whose tap opens nothing",
    fix: "Give its `tap` a `url`, an `open`, a `sheet` or an `action`.",
};

const OPENS: [&str; 4] = ["url", "open", "sheet", "action"];

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    for b in cx.blocks.iter().filter(|b| b.kind == "message") {
        let none = list(b.o, "files").filter(|f| {
            let tap = f.get("tap").and_then(|t| t.as_object());
            !tap.is_some_and(|t| OPENS.iter().any(|k| text(t, k).is_some_and(|s| !s.trim().is_empty())))
        });
        out.extend(none.map(|f| {
            RULE.saw(
                &b.at,
                format!("`{}` opens nothing", text(f, "name").unwrap_or_default()),
            )
        }));
    }
}
