use serde::Deserialize;
use serde_json::{Map, Value};

use crate::behave::{at_start, View};
use crate::tree::{a11y, VARIANTS};
use crate::{Block, Locale};

pub(crate) fn esc(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    esc_into(&mut out, s);
    out
}

fn esc_into(out: &mut String, s: &str) {
    let mut rest = s;
    while let Some(at) = rest
        .bytes()
        .position(|b| matches!(b, b'&' | b'<' | b'>' | b'"' | b'\''))
    {
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

pub(crate) fn link<'v>(v: &'v Value, k: &str) -> Option<&'v str> {
    get(v, k).filter(|u| crate::kind::linkable(u))
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
    Copy(String),
    Stay,
}

pub(crate) struct W<'a> {
    pub(crate) view: View,
    pub(crate) thai: bool,
    pub(crate) locale: Locale,
    pub(super) out: String,
    pub(super) forms: String,
    pub(crate) multipart: bool,
    n: u32,
    screen: String,
    action: &'a str,
}

impl<'a> W<'a> {
    pub(super) fn new(root: &Value, action: &'a str) -> Self {
        let screen = shown(root.get("id"));
        Self {
            view: at_start(root),
            thai: false,
            locale: root
                .get("locale")
                .and_then(|l| Locale::deserialize(l).ok())
                .unwrap_or_default(),
            out: String::new(),
            forms: String::new(),
            multipart: false,
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
            "<form id=\"{id}\" method=\"post\"{} action=\"{}\" hidden>",
            if self.multipart {
                " enctype=\"multipart/form-data\""
            } else {
                ""
            },
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
            Go::Copy(s) => {
                all.extend([("type", "button"), ("data-copy", s.as_str())]);
                false
            }
            Go::Stay => {
                all.push(("type", "button"));
                false
            }
        };
        let (tag, cls) = if a {
            ("a", format!("btn {cls}").trim_end().to_string())
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
        if let Some(u) = link(t, "url") {
            return Go::Url(u.into());
        }
        if let Some(o) = link(t, "open") {
            return Go::Open(o.into());
        }
        if let Some(s) = get(t, "sheet") {
            return Go::Sheet(s.into());
        }
        if let Some(c) = get(t, "copy") {
            return Go::Copy(c.into());
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

pub(crate) fn toned(v: Option<&Value>) -> (String, String) {
    match v {
        Some(o @ Value::Object(_)) => (shown(o.get("text")), shown(o.get("tone"))),
        v => (shown(v), String::new()),
    }
}

pub(crate) fn ticked(w: &mut W<'_>, tag: &str, cls: &str, v: Option<&Value>) {
    w.open(tag, cls, &[]);
    match v {
        Some(t) if t.get("since").is_some() || t.get("until").is_some() => {
            let label = shown(t.get("label")).replace("{}", "").replace("{rel}", "");
            w.open("span", "", &[("data-tick", &t.to_string())]);
            w.text(label.trim());
            w.close("span");
        }
        Some(t) if t.get("get").is_some() => {
            let key = shown(t.get("get"));
            let text = w.view.values.get(&key).cloned().unwrap_or_default();
            w.open("span", "", &[("data-get", &key)]);
            w.text(&text);
            w.close("span");
        }
        v => w.text(&shown(v)),
    }
    w.close(tag);
}

pub(crate) fn badge(w: &mut W<'_>, cls: &str, v: Option<&Value>) {
    if let Some(b) = v.filter(|v| !v.is_null()) {
        let text = if b.is_object() { b.get("text") } else { Some(b) };
        w.raw(" ");
        ticked(w, "span", &format!("tag {cls} {}", toned(Some(b)).1), text);
    }
}
