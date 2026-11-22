use crate::guard::cx::{each, Cx};
use crate::guard::{Rule, Seen, Severity};

pub(super) const RULE: Rule = Rule {
    id: "catalog/open",
    severity: Severity::Error,
    since: 4,
    what: "a tap with `open`, `sheet` or `thread` in a block held to a catalog",
    fix: "Send an action instead; the app opens the screen.",
};

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    for (_, b) in cx.held() {
        let mut bad = vec![];
        each(b.o, &mut |_, k, v| {
            let opens = ["open", "sheet", "thread"]
                .into_iter()
                .filter(|o| k == "tap" && v.get(o).is_some());
            bad.extend(opens.map(|o| format!("tap.{o}")));
        });
        out.extend(bad.into_iter().map(|o| RULE.saw(&b.at, format!("`{o}`"))));
    }
}
