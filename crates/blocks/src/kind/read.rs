use crate::kind::{Part, Span};

enum Open {
    Para(String),
    Quote(String),
    List(bool, Vec<String>),
}

pub(crate) fn read(markdown: &str) -> Vec<Part> {
    let mut parts = vec![];
    let mut open: Option<Open> = None;
    let mut lines = markdown.lines();
    while let Some(line) = lines.next() {
        let t = line.trim();
        if let Some(lang) = t.strip_prefix("```") {
            close(&mut open, &mut parts);
            let body: Vec<&str> = lines
                .by_ref()
                .take_while(|l| !l.trim_start().starts_with("```"))
                .collect();
            let lang = Some(lang.trim()).filter(|l| !l.is_empty()).map(Into::into);
            parts.push(Part::Code {
                lang,
                text: body.join("\n"),
            });
        } else if t.is_empty() {
            close(&mut open, &mut parts);
        } else if let Some((level, text)) = heading(t) {
            close(&mut open, &mut parts);
            let spans = spans(text);
            parts.push(Part::Heading { level, spans });
        } else if rule(t) {
            close(&mut open, &mut parts);
            parts.push(Part::Rule);
        } else if let Some(text) = t.strip_prefix('>') {
            if let Some(Open::Quote(q)) = &mut open {
                join(q, text.trim());
            } else {
                close(&mut open, &mut parts);
                open = Some(Open::Quote(text.trim().into()));
            }
        } else if let Some((ordered, text)) = item(t) {
            match &mut open {
                Some(Open::List(o, items)) if *o == ordered => items.push(text.into()),
                _ => {
                    close(&mut open, &mut parts);
                    open = Some(Open::List(ordered, vec![text.into()]));
                }
            }
        } else {
            match &mut open {
                Some(Open::Para(p) | Open::Quote(p)) => join(p, t),
                Some(Open::List(_, items)) => items.last_mut().into_iter().for_each(|i| join(i, t)),
                None => open = Some(Open::Para(t.into())),
            }
        }
    }
    close(&mut open, &mut parts);
    parts
}

fn join(to: &mut String, more: &str) {
    if !to.is_empty() && !more.is_empty() {
        to.push(' ');
    }
    to.push_str(more);
}

fn close(open: &mut Option<Open>, parts: &mut Vec<Part>) {
    parts.extend(open.take().map(|o| match o {
        Open::Para(t) => Part::Para { spans: spans(&t) },
        Open::Quote(t) => Part::Quote { spans: spans(&t) },
        Open::List(ordered, items) => Part::List {
            ordered,
            items: items.iter().map(|i| spans(i)).collect(),
        },
    }));
}

fn heading(t: &str) -> Option<(u8, &str)> {
    let text = t.trim_start_matches('#');
    let level = u8::try_from(t.len() - text.len())
        .ok()
        .filter(|l| (1..=6).contains(l))?;
    (text.is_empty() || text.starts_with(' ')).then(|| (level, text.trim()))
}

fn rule(t: &str) -> bool {
    let marks: String = t.chars().filter(|c| *c != ' ').collect();
    ['-', '*', '_']
        .iter()
        .any(|m| marks.len() >= 3 && marks.chars().all(|c| c == *m))
}

fn item(t: &str) -> Option<(bool, &str)> {
    if let Some(text) = ["- ", "* ", "+ "].iter().find_map(|m| t.strip_prefix(m)) {
        return Some((false, text.trim()));
    }
    let digits = t.trim_start_matches(|c: char| c.is_ascii_digit());
    let text = digits.strip_prefix(". ").or_else(|| digits.strip_prefix(") "));
    text.filter(|_| digits.len() < t.len()).map(|x| (true, x.trim()))
}

#[derive(Clone, Copy, Default)]
struct Marks {
    bold: bool,
    italic: bool,
    code: bool,
}

fn spans(s: &str) -> Vec<Span> {
    let mut out = vec![];
    inline(s, Marks::default(), None, &mut out);
    out
}

fn push(out: &mut Vec<Span>, text: &str, m: Marks, link: Option<&str>) {
    let span = Span {
        text: text.into(),
        bold: m.bold.then_some(true),
        italic: m.italic.then_some(true),
        code: m.code.then_some(true),
        link: link.map(Into::into),
    };
    let same = |s: &Span| (s.bold, s.italic, s.code, &s.link) == (span.bold, span.italic, span.code, &span.link);
    match out.last_mut() {
        _ if text.is_empty() => {}
        Some(last) if same(last) => last.text.push_str(text),
        _ => out.push(span),
    }
}

fn inline(s: &str, m: Marks, link: Option<&str>, out: &mut Vec<Span>) {
    let (mut rest, mut plain, mut word) = (s, String::new(), false);
    while let Some(c) = rest.chars().next() {
        let mark = |x: &str| between(rest, x).filter(|_| !(word && x.starts_with('_')));
        let found = if let Some((text, url, left)) = linked(rest) {
            let url = if link.is_none() && linkable(url) {
                Some(url)
            } else {
                link
            };
            Some((text, m, url, left))
        } else if let Some((x, left)) = between(rest, "`") {
            push(out, &std::mem::take(&mut plain), m, link);
            push(out, x, Marks { code: true, ..m }, link);
            (rest, word) = (left, false);
            continue;
        } else if let Some((x, left)) = mark("**").or_else(|| mark("__")) {
            Some((x, Marks { bold: true, ..m }, link, left))
        } else if let Some((x, left)) = mark("*").or_else(|| mark("_")) {
            Some((x, Marks { italic: true, ..m }, link, left))
        } else {
            None
        };
        if let Some((inner, marks, to, left)) = found {
            push(out, &std::mem::take(&mut plain), m, link);
            inline(inner, marks, to, out);
            (rest, word) = (left, false);
            continue;
        }
        let escaped = rest
            .strip_prefix('\\')
            .and_then(|e| e.chars().next().filter(char::is_ascii_punctuation));
        let c = escaped.unwrap_or(c);
        plain.push(c);
        word = c.is_alphanumeric();
        rest = rest
            .get(c.len_utf8() + usize::from(escaped.is_some())..)
            .unwrap_or_default();
    }
    push(out, &plain, m, link);
}

fn between<'a>(s: &'a str, mark: &str) -> Option<(&'a str, &'a str)> {
    let body = s.strip_prefix(mark)?;
    let end = body.find(mark).filter(|e| *e > 0)?;
    let inner = body.get(..end)?;
    let flanked = mark == "`" || !(inner.starts_with(' ') || inner.ends_with(' '));
    flanked.then_some((inner, body.get(end + mark.len()..)?))
}

fn linked(s: &str) -> Option<(&str, &str, &str)> {
    let (text, after) = s.strip_prefix('[')?.split_once("](")?;
    let (url, left) = after.split_once(')')?;
    (!text.is_empty() && !text.contains(']') && !url.contains(' ')).then_some((text, url, left))
}

pub(crate) fn linkable(url: &str) -> bool {
    let head = url.split(['/', '?', '#']).next().unwrap_or_default();
    head.split_once(':').is_none_or(|(scheme, _)| {
        let bare = scheme.chars().filter(|c| *c > ' ' && !c.is_control());
        ["http", "https", "mailto"]
            .iter()
            .any(|s| bare.clone().map(|c| c.to_ascii_lowercase()).eq(s.chars()))
    })
}
