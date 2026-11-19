mod kinds;
mod pages;
mod ui;

use std::error::Error;
use std::fs;
use std::path::{Path, PathBuf};

use blocks::site::{self, Head, Live, Look, Site};
use blocks::theme::{self, Fills, Format, Marks, Scale, Scheme, Sections, Style, Surface, TypeDesign};
use blocks::Built;
use serde_json::Value;

use ui::Page;

const BASE: &str = "https://jirathip-dev.github.io/blocks/";

fn style() -> Result<Style, String> {
    Ok(Style {
        format: Format::try_from(2)?,
        type_: TypeDesign::Default,
        space: Scale::default(),
        radius: Scale::try_from(0.0)?,
        motion: Scale::default(),
        surface: Surface::Solid,
        fills: Fills::Tint,
        marks: Marks::Symbols,
        sections: Sections::Title,
        labels: std::collections::BTreeMap::new(),
    })
}

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

fn css(panels: &[(&str, &Scheme)]) -> String {
    let style: String = theme::DEFAULT_STYLE.iter().map(|(k, v)| format!("{k}:{v};")).collect();
    let mut out = format!(":root{{{style}}}\n");
    for (id, s) in panels {
        out.push_str(&format!("[data-id=s-{id}]{{{}}}\n", vars(s)));
    }
    for (i, t) in pages::SWATCHES.iter().enumerate() {
        out.push_str(&format!(
            "[data-id^=sw-] button:nth-child({}){{background:var({t})}}\n",
            i + 1
        ));
    }
    out + include_str!("../site.css")
}

fn pages(bench: Option<&Value>, paper: &Scheme) -> Vec<Page> {
    let all = kinds::samples();
    let mut out = vec![
        pages::home(all.len(), bench),
        kinds::gallery(&all),
        pages::schemes(paper),
        pages::numbers(bench),
    ];
    out.extend((0..all.len()).filter_map(|i| kinds::kind_page(&all, i)));
    out
}

fn write(out: &Path, p: &Page, look: &Look, looks: &[(&str, &Scheme)]) -> Result<(), Box<dyn Error>> {
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
            js: "blocks.js",
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
    let paper = pages::paper()?;
    let misses = theme::gate(&paper);
    if !misses.is_empty() {
        return Err(format!("Paper fails theme::gate: {misses:?}").into());
    }
    let pair = theme::default();
    let looks = [("light", &pair.light), ("dark", &pair.dark), ("paper", &paper)];
    let look = Look {
        schemes: pair.clone(),
        style: style()?,
    };
    fs::create_dir_all(out.join("media"))?;
    for p in pages(bench.as_ref(), &paper) {
        write(&out, &p, &look, &looks)?;
    }
    for f in ["blocks.js", "blocks.css"] {
        fs::copy(root.join("web/dist").join(f), out.join(f))?;
    }
    for f in fs::read_dir(root.join("site/media"))? {
        let f = f?;
        fs::copy(f.path(), out.join("media").join(f.file_name()))?;
    }
    fs::write(out.join("site.css"), css(&looks))?;
    Ok(())
}
