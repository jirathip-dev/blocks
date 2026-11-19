use serde_json::Value;

use crate::guard::cx::Cx;
use crate::guard::{Rule, Seen, Severity};
pub(super) const RULE: Rule = Rule {
    id: "lint/island-unsized",
    severity: Severity::Warn,
    since: 1,
    what: "an island with no size",
    fix: "Reserve its box with `size`, so the page does not jump when it loads.",
};

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    let bare = cx
        .blocks
        .iter()
        .filter(|b| b.kind == "island" && b.o.get("size").is_none_or(Value::is_null));
    out.extend(bare.map(|b| RULE.saw(&b.at, "")));
}
