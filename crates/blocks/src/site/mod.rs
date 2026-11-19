mod content;
mod diagram;
mod editor;
mod rounds;
mod scene;
mod steps;
mod views;

use serde_json::{Map, Value};

use crate::behave::{at_start, View};
use crate::theme::{css, PerMode, Scheme, Style};
use crate::tree::{a11y, VARIANTS};
use crate::{Block, Built};

/// What a page's head says: its title, description, canonical URL, preview image and language.
pub struct Head<'a> {
    pub title: &'a str,
    pub description: &'a str,
    pub canonical: &'a str,
    pub image: Option<&'a str>,
    pub lang: &'a str,
}

/// Where the live renderer and the stream are (empty: none), and the schemes its look sheet offers by name.
pub struct Live<'a> {
    pub js: &'a str,
    pub stream: &'a str,
    pub looks: &'a [(&'a str, &'a Scheme)],
}

/// The schemes for both modes and the style a page wears, as CSS variables in its head.
pub struct Look {
    pub schemes: PerMode<Scheme>,
    pub style: Style,
}

/// A page's settings: its head, look, the app's stylesheets, where a form posts, and the live renderer.
pub struct Site<'a> {
    pub head: Head<'a>,
    pub look: &'a Look,
    pub css: &'a [&'a str],
    pub action: &'a str,
    pub live: Option<Live<'a>>,
}

/// A built screen as a whole HTML document that reads, links and posts with no JS.
pub fn page(screen: &Built, site: &Site<'_>) -> String {
    let mut w = W::new(screen.value(), site.action);
    block(&mut w, screen.value());
    let h = &site.head;
    let mut out = format!(
        "<!doctype html><html lang=\"{}\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>{}</title>",
        esc(h.lang),
        esc(h.title)
    );
    let mut meta = |k: &str, n: &str, v: &str| out.push_str(&format!("<meta {k}=\"{n}\" content=\"{}\">", esc(v)));
    meta("name", "description", h.description);
    meta("property", "og:title", h.title);
    meta("property", "og:description", h.description);
    meta("property", "og:url", h.canonical);
    if let Some(i) = h.image {
        meta("property", "og:image", i);
    }
    let card = if h.image.is_some() {
        "summary_large_image"
    } else {
        "summary"
    };
    meta("name", "twitter:card", card);
    out.push_str(&format!("<link rel=\"canonical\" href=\"{}\">", esc(h.canonical)));
    out.push_str(&format!(
        "<style>{}</style>",
        css(&site.look.schemes, &site.look.style).replace('<', "\\3c ")
    ));
    for href in site.css {
        out.push_str(&format!("<link rel=\"stylesheet\" href=\"{}\">", esc(href)));
    }
    out.push_str(&format!("</head><body><main>{}</main>{}", w.out, w.forms));
    if let Some(l) = &site.live {
        let json = serde_json::to_string(screen.value())
            .unwrap_or_default()
            .replace('<', "\\u003c");
        let looks: Map<String, Value> = l
            .looks
            .iter()
            .map(|(n, s)| ((*n).to_string(), serde_json::to_value(s).unwrap_or_default()))
            .collect();
        out.push_str(&format!(
            "<script type=\"application/vnd.blocks+json\" id=\"blocks-screen\" data-stream=\"{}\" data-action=\"{}\" data-looks=\"{}\">{json}</script><script type=\"module\" src=\"{}\"></script>",
            esc(l.stream),
            esc(site.action),
            esc(&Value::Object(looks).to_string()),
            esc(l.js)
        ));
    }
    out + "</body></html>"
}

/// One built block as the elements `page` writes for it, then the forms its actions post.
pub fn fragment(b: &Built, action: &str) -> String {
    let mut w = W::new(b.value(), action);
    block(&mut w, b.value());
    w.out + &w.forms
}

pub(crate) fn esc(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    esc_into(&mut out, s);
    out
}

fn esc_into(out: &mut String, s: &str) {
    let mut rest = s;
    while let Some(at) = rest.find(['&', '<', '>', '"', '\'']) {
        let (plain, from) = rest.split_at(at);
        out.push_str(plain);
        let mut c = from.chars();
        out.push_str(match c.next() {
            Some('&') => "&#38;",
            Some('<') => "&#60;",
            Some('>') => "&#62;",
            Some('"') => "&#34;",
            _ => "&#39;",
        });
        rest = c.as_str();
    }
    out.push_str(rest);
}

pub(crate) fn get<'v>(v: &'v Value, k: &str) -> Option<&'v str> {
    v.get(k).and_then(Value::as_str)
}

pub(crate) fn list<'v>(v: &'v Value, k: &str) -> &'v [Value] {
    v.get(k).and_then(Value::as_array).map_or(&[], Vec::as_slice)
}

pub(crate) fn shown(v: Option<&Value>) -> String {
    match v {
        Some(Value::String(s)) => s.clone(),
        Some(Value::Number(n)) => n.to_string(),
        Some(Value::Bool(b)) => b.to_string(),
        _ => String::new(),
    }
}

pub(crate) fn on(v: &Value, k: &str) -> bool {
    v.get(k).and_then(Value::as_bool).unwrap_or(false)
}

pub(crate) fn sends(t: Option<&Value>) -> Option<&str> {
    t.filter(|t| ["url", "open", "sheet"].iter().all(|k| get(t, k).is_none()))
        .and_then(|t| get(t, "action"))
}

pub(crate) enum Go {
    Url(String),
    Open(String),
    Post(String, String),
    Sheet(String),
    Stay,
}

pub(crate) struct W<'a> {
    pub(crate) view: View,
    out: String,
    forms: String,
    n: u32,
    screen: String,
    action: &'a str,
}

impl<'a> W<'a> {
    fn new(root: &Value, action: &'a str) -> Self {
        let screen = shown(root.get("id"));
        Self {
            view: at_start(root),
            out: String::new(),
            forms: String::new(),
            n: 0,
            screen,
            action,
        }
    }

    pub(crate) fn raw(&mut self, s: &str) {
        self.out.push_str(s);
    }

    pub(crate) fn text(&mut self, s: &str) {
        esc_into(&mut self.out, s);
    }

    pub(crate) fn open(&mut self, tag: &str, cls: &str, attrs: &[(&str, &str)]) {
        self.out.push('<');
        self.out.push_str(tag);
        let cls = [("class", cls)];
        for (k, v) in cls.iter().filter(|(_, c)| !c.is_empty()).chain(attrs) {
            self.out.push(' ');
            self.out.push_str(k);
            self.out.push_str("=\"");
            esc_into(&mut self.out, v);
            self.out.push('"');
        }
        self.out.push('>');
    }

    pub(crate) fn close(&mut self, tag: &str) {
        self.out.push_str("</");
        self.out.push_str(tag);
        self.out.push('>');
    }

    pub(crate) fn el(&mut self, tag: &str, cls: &str, text: &str) {
        self.open(tag, cls, &[]);
        self.text(text);
        self.close(tag);
    }

    pub(crate) fn open_block(&mut self, tag: &str, cls: &str, b: &Value, attrs: &[(&str, &str)]) {
        let t = get(b, "type").unwrap_or_default();
        let core = Block::KINDS.contains(&t);
        let classes = format!("{cls} b{} b-{t}", if core { "" } else { " b-app" });
        let id = b.get("id").filter(|v| !v.is_null()).map(|v| shown(Some(v)));
        let variant = VARIANTS
            .iter()
            .find(|(k, _)| core && *k == t)
            .and_then(|(_, f)| b.get(*f).filter(|v| !v.is_null()))
            .map(|v| shown(Some(v)));
        let mut all: Vec<(&str, &str)> = vec![("data-block", t)];
        all.extend(id.as_deref().map(|i| ("data-id", i)));
        all.extend(variant.as_deref().map(|v| ("data-variant", v)));
        all.extend(get(b, "tone").map(|v| ("data-tone", v)));
        if id.as_ref().is_some_and(|i| self.view.hidden.contains(i)) {
            all.push(("hidden", ""));
        }
        let (role, name) = a11y(b);
        all.extend(attrs.iter().filter(|(k, _)| !["role", "aria-label"].contains(k)));
        all.extend([("role", role), ("aria-label", name)]);
        self.open(tag, classes.trim_start(), &all);
    }

    pub(crate) fn post(&mut self, block: Option<&Value>, action: &str, values: &Map<String, Value>) -> String {
        self.n += 1;
        let id = format!("b-f{}", self.n);
        let block = shown(block);
        let mut f = format!(
            "<form id=\"{id}\" method=\"post\" action=\"{}\" hidden>",
            esc(self.action)
        );
        let fixed = [
            ("_screen", self.screen.as_str()),
            ("_block", &block),
            ("_action", action),
        ];
        let rest: Vec<(&str, String)> = values
            .iter()
            .map(|(k, v)| {
                (
                    k.as_str(),
                    if v.is_object() || v.is_array() {
                        v.to_string()
                    } else {
                        shown(Some(v))
                    },
                )
            })
            .collect();
        for (k, v) in fixed.into_iter().chain(rest.iter().map(|(k, v)| (*k, v.as_str()))) {
            f.push_str(&format!(
                "<input type=\"hidden\" name=\"{}\" value=\"{}\">",
                esc(k),
                esc(v)
            ));
        }
        self.forms.push_str(&f);
        self.forms.push_str("</form>");
        id
    }

    pub(crate) fn btn(&mut self, label: &str, cls: &str, go: &Go, attrs: &[(&str, &str)], hook: Option<&Value>) {
        let mut all: Vec<(&str, &str)> = attrs.to_vec();
        let a = match go {
            Go::Url(u) => {
                all.extend([("href", u.as_str()), ("target", "_blank"), ("rel", "noopener")]);
                true
            }
            Go::Open(u) => {
                all.push(("href", u.as_str()));
                true
            }
            Go::Post(f, x) => {
                all.extend([("type", "submit"), ("form", f.as_str())]);
                if !x.is_empty() {
                    all.push(("data-action", x.as_str()));
                }
                false
            }
            Go::Sheet(s) => {
                all.extend([("type", "button"), ("data-sheet", s.as_str())]);
                false
            }
            Go::Stay => {
                all.push(("type", "button"));
                false
            }
        };
        let (tag, cls) = if a {
            ("a", format!("btn {cls}"))
        } else {
            ("button", cls.to_string())
        };
        match hook {
            Some(b) => self.open_block(tag, &cls, b, &all),
            None => self.open(tag, &cls, &all),
        }
        self.el("span", "", label);
        self.close(tag);
    }

    pub(crate) fn submit(
        &mut self,
        label: &str,
        cls: &str,
        b: Option<&Value>,
        action: &str,
        v: &Map<String, Value>,
        at: &[(&str, &str)],
    ) {
        let go = if action.is_empty() {
            Go::Stay
        } else {
            Go::Post(self.post(b, action, v), action.into())
        };
        self.btn(label, cls, &go, at, None);
    }

    pub(crate) fn option(&mut self, value: &str, text: &str, on: bool) {
        let at = [("value", value), ("selected", "")];
        self.open("option", "", if on { &at } else { &at[..1] });
        self.text(text);
        self.close("option");
    }

    pub(crate) fn tap(&mut self, tap: Option<&Value>, block: Option<&Value>) -> Go {
        let Some(t) = tap else { return Go::Stay };
        if let Some(u) = get(t, "url") {
            return Go::Url(u.into());
        }
        if let Some(o) = get(t, "open") {
            return Go::Open(o.into());
        }
        if let Some(s) = get(t, "sheet") {
            return Go::Sheet(s.into());
        }
        match get(t, "action") {
            Some(a) => Go::Post(self.post(block, a, &fields(&[t.get("values")])), a.into()),
            None => Go::Stay,
        }
    }

    pub(crate) fn act(&mut self, a: &Value, cls: &str, block: Option<&Value>) {
        let go = match (a.get("tap"), get(a, "action")) {
            (Some(t), _) => self.tap(Some(t), block),
            (None, Some(x)) => Go::Post(self.post(block, x, &fields(&[a.get("values")])), x.into()),
            (None, None) => Go::Stay,
        };
        let off = crate::behave::sends(a).is_some_and(|k| self.view.acts.contains(k));
        self.btn(
            &shown(a.get("label")),
            cls,
            &go,
            if off { &[("disabled", "")] } else { &[] },
            None,
        );
    }
}

pub(crate) fn one(k: &str, v: Option<&Value>) -> Value {
    Value::Object(Map::from_iter([(k.into(), v.cloned().unwrap_or(Value::Null))]))
}

pub(crate) fn fields(all: &[Option<&Value>]) -> Map<String, Value> {
    let mut m = Map::new();
    for o in all.iter().flatten().filter_map(|v| v.as_object()) {
        m.extend(o.clone());
    }
    m
}

pub(crate) fn kids(w: &mut W<'_>, bs: &[Value]) {
    for b in bs.iter().filter(|b| b.is_object()) {
        block(w, b);
    }
}

pub(crate) fn block(w: &mut W<'_>, b: &Value) {
    match get(b, "type").unwrap_or_default() {
        "screen" => views::screen(w, b),
        "sheet" => views::holder(w, b, "div", "shb", "blocks"),
        "list" => views::holder(w, b, "div", "list", "rows"),
        "section" => views::section(w, b),
        "row" => views::row(w, b),
        "card" => views::card(w, b),
        "choice" => views::choice(w, b),
        "form" => views::form(w, b),
        "config" => views::config(w, b),
        "secret" => views::secret(w, b),
        "run" => views::run(w, b),
        "button" => views::button(w, b),
        "chips" => views::chips(w, b),
        "stat" => views::stat(w, b),
        "text" => views::text(w, b),
        "images" => views::images(w, b),
        "web" => views::web(w, b),
        "composer" => views::composer(w, b),
        "prose" => content::prose(w, b),
        "hero" => content::hero(w, b),
        "media" => content::media(w, b),
        "nav" => content::nav(w, b),
        "diagram" => diagram::diagram(w, b),
        "editor" => editor::editor(w, b),
        "scene" => scene::scene(w, b),
        "island" => island(w, b),
        "steps" => steps::steps(w, b),
        _ => fallback(w, b),
    }
}

fn island(w: &mut W<'_>, b: &Value) {
    let tag = get(b, "name").filter(|n| {
        n.starts_with(|c: char| c.is_ascii_lowercase())
            && n.contains('-')
            && n.chars()
                .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || "-._".contains(c))
    });
    let props = b.get("props").filter(|p| !p.is_null()).map(Value::to_string);
    let attrs: Vec<(&str, &str)> = props.as_deref().map(|p| ("data-props", p)).into_iter().collect();
    fallback_as(w, b, tag.unwrap_or("div"), &attrs);
}

pub(crate) fn fallback(w: &mut W<'_>, b: &Value) {
    fallback_as(w, b, "div", &[]);
}

fn fallback_as(w: &mut W<'_>, b: &Value, tag: &str, attrs: &[(&str, &str)]) {
    let mut all = vec![("data-fallback", "")];
    all.extend_from_slice(attrs);
    w.open_block(tag, "", b, &all);
    let f = b.get("fallback").filter(|f| !f.is_null());
    let title = f.map_or_else(|| b.get("type"), |f| f.get("title"));
    if let Some(t) = title.filter(|t| !t.is_null()) {
        let mut r = Map::from_iter([("type".into(), Value::from("row")), ("title".into(), t.clone())]);
        for k in ["subtitle", "tap"] {
            r.extend(f.and_then(|f| f.get(k)).map(|v| (k.into(), v.clone())));
        }
        views::row_of(w, &Value::Object(r), false);
    }
    kids(w, list(b, "blocks"));
    w.close(tag);
}
