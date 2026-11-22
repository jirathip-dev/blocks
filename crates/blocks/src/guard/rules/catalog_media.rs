use crate::guard::cx::{each, starts, Cx};
use crate::guard::{Rule, Seen, Severity};

pub(super) const RULE: Rule = Rule {
    id: "catalog/media",
    severity: Severity::Error,
    since: 4,
    what: "a `src`, `avatar` or `poster` that starts with none of its catalog's `media`",
    fix: "Load a file only from a start the finding lists; else describe it in text.",
};

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    for (c, b) in cx.held() {
        let mut bad = vec![];
        each(b.o, &mut |_, k, v| {
            let src = ["src", "avatar", "poster"].contains(&k).then(|| v.as_str()).flatten();
            bad.extend(src.filter(|s| !starts(s, &c.media)).map(String::from));
        });
        let may = if c.media.is_empty() {
            "nothing".into()
        } else {
            c.media.join(", ")
        };
        out.extend(
            bad.into_iter()
                .map(|s| RULE.saw(&b.at, format!("`{s}`; a file may start with: {may}"))),
        );
    }
}
