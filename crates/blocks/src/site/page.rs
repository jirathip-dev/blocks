use serde_json::{Map, Value};

use super::kind::block;
use super::write::{esc, W};
use crate::theme::{css, PerMode, Scheme, Style};
use crate::Built;

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
    let h = &site.head;
    let mut w = W::new(screen.value(), site.action);
    w.thai = h.lang.starts_with("th");
    block(&mut w, screen.value());
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
