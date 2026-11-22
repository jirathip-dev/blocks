use crate::guard::cx::{each, md_links, starts, Cx};
use crate::guard::{Rule, Seen, Severity};

pub(super) const RULE: Rule = Rule {
    id: "catalog/link",
    severity: Severity::Error,
    since: 4,
    what:
        "a `url`, `href` or `link`, or a link in `markdown` or `text`, that starts with none of its catalog's `links`",
    fix: "Start a link with one of the starts the finding lists, or write it as text.",
};

pub(super) fn check(cx: &Cx, out: &mut Vec<Seen>) {
    for (c, b) in cx.held() {
        let mut bad = vec![];
        each(b.o, &mut |_, k, v| {
            let mut links: Vec<&str> = ["url", "href", "link"]
                .contains(&k)
                .then(|| v.as_str())
                .flatten()
                .into_iter()
                .collect();
            links.extend(
                ["markdown", "text"]
                    .contains(&k)
                    .then(|| v.as_str().map(md_links))
                    .flatten()
                    .unwrap_or_default(),
            );
            bad.extend(links.into_iter().filter(|u| !starts(u, &c.links)).map(String::from));
        });
        let may = if c.links.is_empty() {
            "nothing".into()
        } else {
            c.links.join(", ")
        };
        out.extend(
            bad.into_iter()
                .map(|u| RULE.saw(&b.at, format!("`{u}`; a link may start with: {may}"))),
        );
    }
}
