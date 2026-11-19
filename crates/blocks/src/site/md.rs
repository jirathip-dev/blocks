use super::write::esc;

pub(super) fn md(s: &str) -> String {
    s.split("```")
        .enumerate()
        .map(|(i, part)| {
            let lang = part.trim_start_matches(|c: char| c.is_ascii_lowercase());
            let part = if i == 0 {
                part
            } else {
                lang.strip_prefix('\n').unwrap_or(lang)
            };
            if i % 2 == 1 {
                let body = part.strip_suffix('\n').unwrap_or(part);
                return format!(
                    "<div class=cb><pre>{}</pre><button type=button class=cpy><span>copy</span></button></div>",
                    esc(body)
                );
            }
            let t = links(pairs(pairs(esc(part), "`", '`', "code"), "**", '*', "b"));
            if t.contains('\n') {
                t.replace('\n', "<br>")
            } else {
                t
            }
        })
        .collect()
}

fn pairs(s: String, mark: &str, stop: char, tag: &str) -> String {
    if !s.contains(mark) {
        return s;
    }
    let mut out = String::with_capacity(s.len());
    let mut rest = s.as_str();
    while let Some(at) = rest.find(mark) {
        let (before, from) = rest.split_at(at);
        out.push_str(before);
        let inner = from.get(mark.len()..).unwrap_or_default();
        let end = inner.find(stop).unwrap_or(inner.len());
        let (body, after) = inner.split_at(end);
        if let Some(next) = after.strip_prefix(mark).filter(|_| !body.is_empty()) {
            out.push_str(&format!("<{tag}>{body}</{tag}>"));
            rest = next;
        } else {
            let mut c = from.chars();
            out.extend(c.next());
            rest = c.as_str();
        }
    }
    out + rest
}

fn links(s: String) -> String {
    if !s.contains('[') && !s.contains("http") {
        return s;
    }
    let mut out = String::with_capacity(s.len());
    let mut rest = s.as_str();
    while !rest.is_empty() {
        if let Some((text, url, next)) = named_link(rest) {
            out.push_str(&format!("<a href=\"{url}\" target=_blank rel=noopener>{text}</a>"));
            rest = next;
        } else if rest.starts_with("http://") || rest.starts_with("https://") {
            let run = rest.find(|c: char| c.is_whitespace() || c == '<').unwrap_or(rest.len());
            let url = rest
                .get(..run)
                .unwrap_or_default()
                .trim_end_matches(['.', ',', ';', ':', '!', '?', ')']);
            out.push_str(&format!("<a href=\"{url}\" target=_blank rel=noopener>{url}</a>"));
            rest = rest.get(url.len()..).unwrap_or_default();
        } else {
            let mut c = rest.chars();
            out.extend(c.next());
            rest = c.as_str();
        }
    }
    out
}

fn named_link(s: &str) -> Option<(&str, &str, &str)> {
    let (text, after) = s.strip_prefix('[')?.split_once("](")?;
    let end = after.find(|c: char| c == ')' || c.is_whitespace())?;
    let (url, close) = after.split_at(end);
    let ok = !text.is_empty()
        && !text.contains(']')
        && url.starts_with("http")
        && url.get(4..)?.trim_start_matches('s').starts_with(':');
    ok.then_some((text, url, close.strip_prefix(')')?))
}
