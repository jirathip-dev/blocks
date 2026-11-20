mod kinds;
mod live;
mod looks;
mod pages;
mod play;
mod sizes;
mod styles;
mod ui;

use std::error::Error;
use std::fs;
use std::path::{Path, PathBuf};

use blocks::site::{self, Head, Live, Look, Site};
use blocks::theme::{self, Scheme};
use blocks::Built;
use serde_json::Value;

use ui::Page;

const BASE: &str = "https://jirathip-dev.github.io/blocks/";

fn vars(s: &Scheme) -> String {
    let mode = match s.mode {
        theme::Mode::Dark => "dark",
        theme::Mode::Light => "light",
    };
    let all: String = s
        .tokens
        .all()
        .iter()
        .map(|(k, v)| format!("{k}:{};", v.as_str()))
        .collect();
    format!("{all}color-scheme:{mode}")
}

type Named = (&'static str, &'static str, Look);

fn css(looks: &[Named]) -> String {
    let style: String = theme::DEFAULT_STYLE.iter().map(|(k, v)| format!("{k}:{v};")).collect();
    let mut out = format!(":where(:root){{{style}}}\n");
    for (id, _, l) in looks {
        out.push_str(&format!(
            "[data-id=s-{id}]{{{}}}\n@media (prefers-color-scheme: dark){{[data-id=s-{id}]{{{}}}}}\n",
            vars(&l.schemes.light),
            vars(&l.schemes.dark)
        ));
    }
    let worn: Vec<String> = looks
        .iter()
        .map(|(id, _, _)| format!("html[data-look={id}] [data-sheet=\"look:{id}\"]"))
        .collect();
    out.push_str(&format!(
        "html:not([data-look]) [data-sheet=\"look:default\"],{}{{background:var(--l);border-color:var(--l);color:var(--bg)}}\n",
        worn.join(",")
    ));
    for (i, t) in pages::SWATCHES.iter().enumerate() {
        out.push_str(&format!(
            "[data-id^=sw-] button:nth-child({}){{background:var({t})}}\n",
            i + 1
        ));
    }
    out + include_str!("../site.css") + &sizes::css()
}

fn pages(bench: Option<&Value>, looks: &[Named]) -> Result<Vec<Page>, String> {
    let all = kinds::samples();
    let home = pages::home(all.len(), bench);
    let mut out = vec![
        play::playground(&home, &all),
        home,
        kinds::gallery(&all),
        styles::styles(looks),
        pages::numbers(bench),
        live::behaviours(),
        live::islands(),
        sizes::layout()?,
    ];
    out.extend((0..all.len()).filter_map(|i| kinds::kind_page(&all, i)));
    Ok(out)
}

fn write(out: &Path, p: &Page, look: &Look, looks: &[(&str, &Look)]) -> Result<(), Box<dyn Error>> {
    let built = Built::of(&p.screen);
    let faults = built.check(&[]);
    if !faults.is_empty() {
        return Err(format!("{}: {faults:?}", p.file).into());
    }
    let path = if p.file == "index.html" { "" } else { p.file.as_str() };
    let canonical = format!("{BASE}{path}");
    let title = if p.file == "index.html" {
        "blocks: typed screens, three renderers".to_string()
    } else {
        format!("{} · blocks", p.title)
    };
    let s = Site {
        head: Head {
            title: &title,
            description: &p.description,
            canonical: &canonical,
            image: None,
            lang: "en",
        },
        look,
        css: &["blocks.css", "site.css"],
        action: "",
        live: Some(Live {
            js: p.js,
            stream: "",
            looks,
        }),
    };
    fs::write(out.join(&p.file), site::page(&built, &s) + "\n")?;
    Ok(())
}

fn main() -> Result<(), Box<dyn Error>> {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("..");
    let out = std::env::args()
        .nth(1)
        .map_or_else(|| root.join("target/site"), PathBuf::from);
    let bench: Option<Value> = fs::read_to_string(root.join("docs/bench-blocks.json"))
        .ok()
        .map(|t| serde_json::from_str(&t))
        .transpose()?;
    let looks = looks::all()?;
    for (name, _, l) in &looks {
        for s in [&l.schemes.light, &l.schemes.dark] {
            let misses = theme::gate(s, l.style.fills);
            if !misses.is_empty() {
                return Err(format!("{name}: {} fails theme::gate: {misses:?}", s.label).into());
            }
        }
    }
    let live: Vec<(&str, &Look)> = looks.iter().map(|(n, _, l)| (*n, l)).collect();
    let Some((_, _, look)) = looks.first() else {
        return Err("no looks".into());
    };
    fs::create_dir_all(out.join("media"))?;
    for p in pages(bench.as_ref(), &looks)? {
        write(&out, &p, look, &live)?;
    }
    for f in ["blocks.js", "blocks.css", "play.js"] {
        fs::copy(root.join("web/dist").join(f), out.join(f))?;
    }
    for f in fs::read_dir(root.join("site/media"))? {
        let f = f?;
        fs::copy(f.path(), out.join("media").join(f.file_name()))?;
    }
    fs::write(out.join("site.css"), css(&looks))?;
    Ok(())
}
