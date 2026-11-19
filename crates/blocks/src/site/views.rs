use serde_json::{Map, Value};

use super::{esc, fields, get, kids, list, on, one, shown, Go, W};

fn toned(v: Option<&Value>) -> (String, String) {
    match v {
        Some(o @ Value::Object(_)) => (shown(o.get("text")), shown(o.get("tone"))),
        v => (shown(v), String::new()),
    }
}

fn ticked(w: &mut W<'_>, tag: &str, cls: &str, v: Option<&Value>) {
    w.open(tag, cls, &[]);
    match v {
        Some(t) if t.get("since").is_some() || t.get("until").is_some() => {
            let label = shown(t.get("label")).replace("{}", "").replace("{rel}", "");
            w.open("span", "", &[("data-tick", &t.to_string())]);
            w.text(label.trim());
            w.close("span");
        }
        v => w.text(&shown(v)),
    }
    w.close(tag);
}

fn badge(w: &mut W<'_>, cls: &str, v: Option<&Value>) {
    if let Some(b) = v.filter(|v| !v.is_null()) {
        let (text, tone) = toned(Some(b));
        w.raw(" ");
        w.el("span", &format!("tag {cls} {tone}"), &text);
    }
}

pub(super) fn holder(w: &mut W<'_>, b: &Value, tag: &str, cls: &str, under: &str) {
    w.open_block(tag, cls, b, &[]);
    kids(w, list(b, under));
    w.close(tag);
}

pub(super) fn screen(w: &mut W<'_>, b: &Value) {
    w.open_block("div", "scr", b, &[]);
    w.open("p", "tabh", &[]);
    w.el("span", "tw b-screen__title", &shown(b.get("title")).to_lowercase());
    for a in list(b, "actions") {
        let menu = a.get("menu").and_then(Value::as_array);
        for m in menu.map_or(std::slice::from_ref(a), Vec::as_slice) {
            w.act(m, "b-screen__actions", None);
        }
    }
    w.close("p");
    kids(w, list(b, "blocks"));
    w.close("div");
}

pub(super) fn section(w: &mut W<'_>, b: &Value) {
    w.open_block("section", "sec", b, &[]);
    if let Some(head) = get(b, "header").filter(|h| !h.is_empty()) {
        let k = match head.split(' ').next().unwrap_or_default() {
            "waiting" | "blocked" => "needs",
            "in" => "working",
            other => other,
        };
        let sh = match k {
            "needs" => "r",
            "working" => "g",
            _ => "",
        };
        w.el("h3", &format!("sh {sh}"), head);
    }
    kids(w, list(b, "blocks"));
    if let Some(f) = get(b, "footer").filter(|f| !f.is_empty()) {
        w.el("p", "m foot", f);
    }
    w.close("section");
}

fn figure(w: &mut W<'_>, f: &Value) {
    let s = get(f, "state").unwrap_or("undefined");
    let (glyph, word, tone) = match s {
        "working" => ("●", "working", "g"),
        "needs" => ("!", "needs you", "r"),
        "fail" => ("✗", "failed", "r"),
        "done" => ("✓", "done", "mute"),
        "merged" => ("✓", "merged", "g"),
        "idle" => ("○", "idle", "mute"),
        other => ("·", other, "mute"),
    };
    w.open(
        "span",
        &format!("rsg {s} b-row__figure"),
        &[("role", "img"), ("aria-label", word), ("title", word)],
    );
    w.el("i", &format!("gl {tone}"), glyph);
    w.close("span");
}

pub(super) fn row(w: &mut W<'_>, b: &Value) {
    row_of(w, b, true);
}

pub(super) fn row_of(w: &mut W<'_>, b: &Value, hooked: bool) {
    let indent = b.get("indent").and_then(Value::as_u64).filter(|i| *i > 0);
    let mut cls = format!(
        "row{}{}{}",
        if get(b, "style") == Some("link") { " link" } else { "" },
        if on(b, "sticky") { " sticky" } else { "" },
        indent.map_or(String::new(), |i| format!(" in{}", i.min(3)))
    );
    let swipe = list(b, "swipe");
    let go = match b.get("tap") {
        Some(t) if get(t, "url").is_none() && get(t, "open").is_none() => Go::Stay,
        t => w.tap(t, b.get("id")),
    };
    let id = shown(b.get("id"));
    let own = swipe.is_empty() && hooked;
    let mut attrs: Vec<(&str, &str)> = if own { vec![] } else { vec![("data-id", &id)] };
    let tag = match &go {
        Go::Url(u) => {
            attrs.extend([("href", u.as_str()), ("target", "_blank"), ("rel", "noopener")]);
            "a"
        }
        Go::Open(u) => {
            attrs.push(("href", u.as_str()));
            "a"
        }
        Go::Post(_) | Go::Stay => "div",
    };
    if tag == "a" || b.get("tap").is_some() || !swipe.is_empty() {
        cls.push_str(" tap");
    }
    if tag == "div" && (b.get("tap").is_some() || !swipe.is_empty()) {
        attrs.extend([("tabindex", "0"), ("role", "button")]);
    }
    if !swipe.is_empty() && hooked {
        w.open_block("div", "rw", b, &[]);
    }
    if own {
        w.open_block(tag, &cls, b, &attrs);
    } else {
        w.open(tag, &cls, &attrs);
    }
    if let Some(f) = b.get("figure").filter(|f| f.is_object()) {
        figure(w, f);
    }
    w.open("span", "rm", &[]);
    w.el("span", "rt b-row__title", &shown(b.get("title")));
    badge(w, "b-row__badge", b.get("badge"));
    if let Some(sub) = b.get("subtitle").filter(|v| !v.is_null()) {
        let cls = format!("rs b-row__subtitle {}", toned(Some(sub)).1);
        ticked(
            w,
            "span",
            &cls,
            if sub.is_object() { sub.get("text") } else { Some(sub) },
        );
    }
    w.close("span");
    if let Some(v) = b.get("value").filter(|v| !v.is_null()) {
        ticked(w, "span", "rv b-row__value", Some(v));
    }
    w.close(tag);
    if swipe.is_empty() {
        return;
    }
    w.open("div", "ra b-row__actions", &[("hidden", "")]);
    for s in swipe {
        let cls = if get(s, "tone") == Some("bad") { "bad" } else { "" };
        w.act(s, cls, b.get("id"));
    }
    w.close("div");
    if hooked {
        w.close("div");
    }
}

pub(super) fn card(w: &mut W<'_>, b: &Value) {
    let cls = format!("card {} k-{}", shown(b.get("tone")), shown(b.get("kind")));
    w.open_block("div", &cls, b, &[]);
    if let Some(fold) = b.get("fold").filter(|f| f.is_object()) {
        w.open(
            "div",
            "fold",
            &[("tabindex", "0"), ("role", "button"), ("aria-expanded", "false")],
        );
        w.el("span", "fl", &shown(fold.get("line")));
        if let Some(m) = fold.get("main").filter(|m| m.is_object()) {
            let v = fields(&[m.get("values"), Some(&one("choice", m.get("value")))]);
            w.submit(
                &shown(m.get("label")),
                "main",
                m.get("block"),
                &shown(m.get("action")),
                &v,
                &[],
            );
        }
        w.close("div");
        w.close("div");
        return;
    }
    let mark = b.get("badge").filter(|v| !v.is_null());
    if get(b, "title").is_some_and(|t| !t.is_empty()) || mark.is_some() {
        w.open("div", "ch", &[]);
        w.el("b", "b-card__title", &shown(b.get("title")));
        badge(w, "b-card__badge", mark);
        if let Some(m) = b.get("meta").filter(|v| !v.is_null()) {
            w.raw(" ");
            ticked(w, "span", "m", Some(m));
        }
        w.close("div");
    }
    if let Some(s) = b.get("subtitle").filter(|v| !v.is_null()) {
        w.el("p", "m b-card__subtitle", &toned(Some(s)).0);
    }
    kids(w, list(b, "blocks"));
    let buttons = list(b, "buttons");
    if buttons.iter().any(Value::is_object) {
        w.open("div", "bar b-card__actions", &[]);
        kids(w, buttons);
        w.close("div");
    }
    w.close("div");
}

pub(super) fn choice(w: &mut W<'_>, b: &Value) {
    w.open_block("div", "choice", b, &[]);
    let rec = b.get("recommended");
    let mut opts: Vec<&Value> = list(b, "options").iter().filter(|o| o.is_object()).collect();
    opts.sort_by_key(|o| o.get("value") != rec || rec.is_none());
    let action = shown(b.get("action"));
    for o in opts {
        let v = fields(&[b.get("values"), o.get("values"), Some(&one("choice", o.get("value")))]);
        let mine = rec.is_some() && o.get("value") == rec;
        let label = format!("{}{}", shown(o.get("label")), if mine { " · recommended" } else { "" });
        w.submit(&label, "pick", b.get("id"), &action, &v, &[]);
    }
    if let Some(d) = b.get("default").filter(|d| d.is_object()) {
        let t = fields(&[Some(&one("until", d.get("until"))), Some(&one("label", d.get("label")))]);
        ticked(w, "p", "m", Some(&Value::Object(t)));
    }
    if let Some(other) = b.get("other").filter(|o| o.is_object()) {
        let v = fields(&[
            b.get("values"),
            Some(&one("choice", Some(&Value::from(shown(other.get("for")))))),
        ]);
        let f = w.post(b.get("id"), &action, &v);
        let hint = get(other, "placeholder").unwrap_or("other…");
        w.open("form", "other", &[]);
        w.open(
            "input",
            "",
            &[
                ("name", "other"),
                ("placeholder", hint),
                ("autocomplete", "off"),
                ("form", &f),
            ],
        );
        w.btn("send", "", &Go::Post(f), &[], None);
        w.close("form");
    }
    w.close("div");
}

pub(super) fn form(w: &mut W<'_>, b: &Value) {
    let cls = if b.get("submit").is_some_and(Value::is_object) {
        "form say"
    } else {
        "form"
    };
    form_of(w, b, cls, false);
}

pub(super) fn config(w: &mut W<'_>, b: &Value) {
    form_of(w, b, "form cfg", true);
}

fn form_of(w: &mut W<'_>, b: &Value, cls: &str, bar: bool) {
    let submit = b.get("submit").filter(|s| s.is_object());
    w.open_block("div", cls, b, &[]);
    let action = submit.and_then(|s| get(s, "action")).or_else(|| get(b, "action"));
    let f = action.map(|a| w.post(b.get("id"), a, &fields(&[submit.and_then(|s| s.get("values"))])));
    let owner = f.clone().unwrap_or_default();
    let tie: &[(&str, &str)] = if f.is_some() { &[("form", &owner)] } else { &[] };
    for x in list(b, "fields").iter().filter(|x| x.is_object()) {
        field(w, x, tie);
    }
    if let (Some(s), Some(f)) = (submit, f) {
        if bar {
            w.open("div", "bar", &[]);
        }
        let off: &[(&str, &str)] = if bar && on(s, "off") { &[("disabled", "")] } else { &[] };
        w.btn(&shown(s.get("label")), "", &Go::Post(f), off, None);
        if bar {
            w.close("div");
        }
    }
    w.close("div");
}

fn note(x: &Value) -> (&'static str, String) {
    let was = x.get("was").filter(|v| !v.is_null());
    match (get(x, "error").filter(|e| !e.is_empty()), was) {
        (Some(e), _) => ("fn err", e.to_owned()),
        (None, Some(v)) => ("fn was", format!("was {}", shown(Some(v)))),
        (None, None) => ("fn", get(x, "doc").unwrap_or_default().to_owned()),
    }
}

fn placeholder(x: &Value, secret: bool) -> &str {
    match (secret && on(x, "set"), get(x, "placeholder")) {
        (true, _) => "set ✓ · type to replace",
        (false, Some(p)) => p,
        (false, None) if secret => "not set",
        (false, None) => "",
    }
}

fn field(w: &mut W<'_>, x: &Value, tie: &[(&str, &str)]) {
    let name = shown(x.get("name"));
    let kind = get(x, "type").unwrap_or_default();
    let error = get(x, "error").filter(|e| !e.is_empty());
    let (note_cls, note) = note(x);
    let row = format!(
        "fd{}{}{}",
        if kind == "toggle" { " tg" } else { "" },
        if error.is_some() { " err" } else { "" },
        if on(x, "open") { " open" } else { "" },
    );
    w.open("label", &row, &[]);
    w.open("span", "fl", &[]);
    w.el(
        "span",
        "fk",
        &get(x, "label").map_or_else(|| name.clone(), String::from),
    );
    w.el("span", note_cls, &note);
    w.close("span");
    let mut attrs: Vec<(&str, &str)> = vec![("name", &name)];
    attrs.extend_from_slice(tie);
    if error.is_some() {
        attrs.push(("aria-invalid", "true"));
    }
    if on(x, "open") {
        attrs.push(("autofocus", ""));
    }
    let value = shown(x.get("value"));
    match kind {
        "toggle" => {
            attrs.extend([("type", "checkbox"), ("role", "switch")]);
            if on(x, "value") {
                attrs.push(("checked", ""));
            }
            w.open("input", "", &attrs);
        }
        "picker" => {
            w.open("select", "", &attrs);
            let mut seen: Vec<String> = vec![];
            for o in std::iter::once(x.get("value")).chain(list(x, "options").iter().map(Some)) {
                let o = shown(o);
                if !o.is_empty() && !seen.contains(&o) {
                    w.option(&o, &o, o == value);
                    seen.push(o);
                }
            }
            w.close("select");
        }
        t => {
            let secret = t == "secret";
            let kb = get(x, "keyboard").unwrap_or_default();
            let ty = match (secret, kb) {
                (true, _) => "password",
                (false, "url") => "url",
                _ => "text",
            };
            attrs.extend([("type", ty), ("autocomplete", "off")]);
            match kb {
                "url" => attrs.push(("inputmode", "url")),
                "number" => attrs.push(("inputmode", "decimal")),
                _ => {}
            }
            attrs.push(("placeholder", placeholder(x, secret)));
            if !secret && !value.is_empty() {
                attrs.push(("value", &value));
            }
            w.open("input", "", &attrs);
        }
    }
    w.close("label");
}

pub(super) fn secret(w: &mut W<'_>, b: &Value) {
    w.open_block("div", "secret", b, &[]);
    let name = shown(b.get("name"));
    let f = w.post(b.get("id"), &shown(b.get("action")), &fields(&[b.get("values")]));
    let set = on(b, "set");
    w.open("label", "fd", &[]);
    w.open("span", "fk", &[]);
    w.text(get(b, "label").unwrap_or(&name));
    if set {
        w.el("span", "set", "set \u{2713}");
    }
    w.close("span");
    let hint = if set {
        "paste to replace"
    } else {
        get(b, "placeholder").unwrap_or_default()
    };
    w.open(
        "input",
        "",
        &[
            ("type", "password"),
            ("name", &name),
            ("placeholder", hint),
            ("autocomplete", "new-password"),
            ("spellcheck", "false"),
            ("form", &f),
        ],
    );
    w.close("label");
    w.open("div", "ra", &[]);
    w.el("p", "m sn", "sent to the app only, never to the agent");
    w.btn("send", "", &Go::Post(f), &[], None);
    w.close("div");
    w.close("div");
}

pub(super) fn run(w: &mut W<'_>, b: &Value) {
    w.open_block("div", "run", b, &[]);
    w.el("pre", "cmd", &shown(b.get("command")));
    let sha = get(b, "sha").filter(|s| !s.is_empty()).map(|s| format!("sha {s}"));
    let meta: Vec<String> = [
        get(b, "dir").map(String::from),
        get(b, "touches").map(String::from),
        sha,
    ]
    .into_iter()
    .flatten()
    .filter(|s| !s.is_empty())
    .collect();
    w.el("p", "m", &meta.join(" · "));
    w.open("div", "bar", &[]);
    for (choice, cls) in [("approve", "primary"), ("deny", "bad")] {
        let v = fields(&[
            Some(&one("choice", Some(&Value::from(choice)))),
            Some(&one("sha", b.get("sha"))),
        ]);
        w.submit(choice, cls, b.get("id"), &shown(b.get("action")), &v, &[]);
    }
    w.close("div");
    w.close("div");
}

pub(super) fn button(w: &mut W<'_>, b: &Value) {
    let go = match (b.get("tap"), get(b, "action")) {
        (Some(t), _) => w.tap(Some(t), b.get("id")),
        (None, Some(a)) => Go::Post(w.post(b.get("id"), a, &fields(&[b.get("values")]))),
        (None, None) => Go::Stay,
    };
    w.btn(&shown(b.get("label")), &shown(b.get("style")), &go, &[], Some(b));
}

pub(super) fn chips(w: &mut W<'_>, b: &Value) {
    w.open_block("div", "chips", b, &[]);
    let sel = list(b, "selected");
    for o in list(b, "options").iter().filter(|o| o.is_object()) {
        let v = o.get("value").cloned().unwrap_or(Value::Null);
        let pressed = sel.contains(&v);
        let at = [("aria-pressed", if pressed { "true" } else { "false" })];
        let v = Map::from_iter([(shown(b.get("name")), v)]);
        let (label, cls) = (shown(o.get("label")), if pressed { "on" } else { "" });
        w.submit(&label, cls, b.get("id"), &shown(b.get("action")), &v, &at);
    }
    w.close("div");
}

pub(super) fn stat(w: &mut W<'_>, b: &Value) {
    w.open_block("div", "stats", b, &[]);
    let items = b.get("items").and_then(Value::as_array);
    for i in items
        .map_or(std::slice::from_ref(b), Vec::as_slice)
        .iter()
        .filter(|i| i.is_object())
    {
        w.open("div", &format!("st {}", shown(i.get("tone"))), &[]);
        ticked(w, "b", "b-stat__value", i.get("value"));
        if let Some(u) = get(i, "unit").filter(|u| !u.is_empty()) {
            w.raw(" ");
            w.el("small", "", u);
        }
        w.el("span", "m", &shown(i.get("label")));
        let sp: Vec<f64> = list(i, "spark")
            .iter()
            .map(|v| v.as_f64().unwrap_or(f64::NAN))
            .collect();
        let hi = sp.iter().copied().fold(1.0, f64::max);
        if sp.len() > 1 {
            let points: Vec<String> = sp
                .iter()
                .enumerate()
                .map(|(x, v)| format!("{x},{}", 10.0 - (v / hi) * 10.0))
                .collect();
            w.raw(&format!(
                "<svg class=\"spark\" viewBox=\"0 0 {} 10\" preserveAspectRatio=\"none\" aria-hidden=\"true\"><polyline points=\"{}\"></polyline></svg>",
                sp.len() - 1,
                points.join(" ")
            ));
        }
        w.close("div");
    }
    w.close("div");
}

pub(super) fn text(w: &mut W<'_>, b: &Value) {
    let source = shown(b.get("markdown"));
    w.open_block("div", "txt", b, &[("data-md", &source)]);
    w.raw(&md(&source));
    w.close("div");
}

fn md(s: &str) -> String {
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
            let t = pairs(&pairs(&esc(part), "`", '`', "code"), "**", '*', "b");
            links(&t).replace('\n', "<br>")
        })
        .collect()
}

fn pairs(s: &str, mark: &str, stop: char, tag: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut rest = s;
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

fn links(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut rest = s;
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

pub(super) fn images(w: &mut W<'_>, b: &Value) {
    w.open_block("div", "imgs", b, &[]);
    for i in list(b, "items").iter().filter(|i| i.is_object()) {
        let src = shown(i.get("src"));
        w.open("a", "", &[("href", &src), ("target", "_blank"), ("rel", "noopener")]);
        w.open(
            "img",
            "",
            &[("src", &src), ("alt", &shown(i.get("alt"))), ("loading", "lazy")],
        );
        w.close("a");
    }
    w.close("div");
}

pub(super) fn composer(w: &mut W<'_>, b: &Value) {
    let acts = b.get("acts");
    let act = |k: &str| acts.and_then(|a| get(a, k)).unwrap_or_default().to_string();
    w.open_block("div", "cmp", b, &[]);
    for m in list(b, "queued").iter().filter(|m| m.is_object()) {
        let q = shown(m.get("q"));
        w.open("div", "qd", &[("data-q", &q)]);
        w.el("span", "qt", &shown(m.get("text")));
        let qv = fields(&[Some(&one("q", m.get("q")))]);
        w.submit("send now", "primary", b.get("id"), &act("steer"), &qv, &[]);
        w.btn("edit", "", &Go::Stay, &[], None);
        w.submit("remove", "bad", b.get("id"), &act("unqueue"), &qv, &[]);
        w.close("div");
    }
    let f = w.post(b.get("id"), &shown(b.get("action")), &fields(&[b.get("values")]));
    w.open("div", "cr", &[]);
    w.btn("+", "", &Go::Stay, &[("aria-label", "attach")], None);
    w.open("input", "", &[("type", "file"), ("multiple", ""), ("hidden", "")]);
    let hint = shown(b.get("placeholder"));
    w.open(
        "textarea",
        "",
        &[("name", "text"), ("rows", "1"), ("placeholder", &hint), ("form", &f)],
    );
    w.close("textarea");
    let label = if b.get("working").is_some_and(|x| !x.is_null()) {
        "queue".into()
    } else {
        shown(b.get("label"))
    };
    w.btn(&label, "primary", &Go::Post(f.clone()), &[], None);
    w.close("div");
    let chips: Vec<&Value> = list(b, "chips").iter().filter(|c| c.is_object()).collect();
    if !chips.is_empty() {
        w.open("div", "pk", &[]);
        for ch in chips {
            let n = shown(ch.get("name"));
            let cur = shown(ch.get("cur"));
            w.open("select", "", &[("aria-label", &n), ("name", &n), ("form", &f)]);
            if cur.is_empty() {
                w.option("", &n, true);
            }
            for o in list(ch, "all").iter().map(|o| shown(Some(o))) {
                w.option(&o, &o, o == cur);
            }
            w.close("select");
        }
        w.close("div");
    }
    w.close("div");
}
