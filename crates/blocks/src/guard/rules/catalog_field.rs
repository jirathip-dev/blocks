use std::collections::BTreeSet;

use crate::catalog::NEVER;
use crate::guard::cx::{each, Cx};
use crate::guard::{Rule, Seen, Severity};

pub(super) const RULE: Rule = Rule {
    id: "catalog/field",
    severity: Severity::Error,
    since: 4,
    what: "a field its kind's catalog entry does not offer, or one no catalog offers",
    fix: "Leave the field out: the kind takes the fields listed in the finding.",
};

const WRITTEN: [&str; 3] = ["type", "id", "fallback"];

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    for (c, b) in cx.held() {
        let Some(allow) = c.kinds.get(b.kind) else { continue };
        let offered = |k: &str| allow.fields.as_ref().is_none_or(|f| f.iter().any(|x| x == k));
        let top = b.o.keys().filter(|k| !WRITTEN.contains(&k.as_str()) && !offered(k));
        let mut bad: BTreeSet<String> = top.cloned().collect();
        each(b.o, &mut |o, k, v| {
            let tap = ["focus", "keep"]
                .into_iter()
                .filter(|t| k == "tap" && v.get(t).is_some());
            bad.extend(tap.map(|t| format!("tap.{t}")));
            if (NEVER.contains(&k) && !WRITTEN.contains(&k)) || (k == "get" && o.len() == 1) {
                bad.insert(k.into());
            }
        });
        let takes = allow.fields.as_ref().map_or("any it has".into(), |f| f.join(", "));
        out.extend(
            bad.into_iter()
                .map(|f| RULE.saw(&b.at, format!("`{f}`; this kind takes: {takes}"))),
        );
    }
}
