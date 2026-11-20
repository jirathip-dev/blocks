use serde_json::Value;

use crate::site::write::{get, shown, W};

pub(super) fn draw(w: &mut W<'_>, b: &Value) {
    let raw = get(b, "src").unwrap_or_default();
    let src: String = raw
        .trim_matches(|c: char| c <= ' ')
        .chars()
        .filter(|c| !matches!(c, '\t' | '\n' | '\r'))
        .collect();
    let src = src.as_str();
    let height = format!("height:{}px", shown(b.get("height")));
    let scheme = src.split_once(':').map(|(s, _)| s).filter(|s| {
        s.starts_with(|c: char| c.is_ascii_alphabetic())
            && s.chars().all(|c| c.is_ascii_alphanumeric() || "+.-".contains(c))
    });
    w.open_block("div", "web", b, &[]);
    if scheme.is_some_and(|s| !s.eq_ignore_ascii_case("http") && !s.eq_ignore_ascii_case("https")) {
        w.open("div", "wf none", &[("style", &height)]);
        w.text("This page can't be shown here.");
        w.close("div");
        w.close("div");
        return;
    }
    let rest = scheme.and_then(|s| src.get(s.len() + 1..));
    let bare = rest.and_then(|r| r.strip_prefix("//")).unwrap_or(src);
    let addr = bare.split(['?', '#']).next().unwrap_or_default();
    let addr = addr.strip_suffix('/').unwrap_or(addr);
    let sandbox = "allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox";
    let at = [
        ("style", height.as_str()),
        ("sandbox", sandbox),
        ("allow", ""),
        ("referrerpolicy", "no-referrer"),
        ("loading", "lazy"),
        ("title", addr),
        ("src", src),
    ];
    w.open("iframe", "wf", &at);
    w.close("iframe");
    w.open("div", "wm", &[]);
    w.el("span", "wu", addr);
    w.open("a", "", &[("href", src), ("target", "_blank"), ("rel", "noopener")]);
    w.text("open ↗");
    w.close("a");
    w.close("div");
    w.close("div");
}
