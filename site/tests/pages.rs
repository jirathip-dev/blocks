use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

fn build(name: &str) -> PathBuf {
    let out = Path::new(env!("CARGO_TARGET_TMPDIR")).join(name);
    let ok = Command::new(env!("CARGO_BIN_EXE_blocks-site"))
        .arg(&out)
        .status()
        .unwrap();
    assert!(ok.success());
    out
}

fn pages(out: &Path) -> Vec<(String, String)> {
    let mut all: Vec<(String, String)> = fs::read_dir(out)
        .unwrap()
        .map(|f| f.unwrap().file_name().into_string().unwrap())
        .filter(|f| Path::new(f).extension().is_some_and(|e| e == "html"))
        .map(|f| (f.clone(), fs::read_to_string(out.join(&f)).unwrap()))
        .collect();
    all.sort();
    all
}

#[test]
fn every_page_has_its_head_and_no_url_from_the_domain_root() {
    let out = build("pages");
    let all = pages(&out);
    assert_eq!(all.len(), 8 + 37);
    for (f, html) in &all {
        for want in [
            "<title>",
            "<meta name=\"description\" content=\"",
            "<meta property=\"og:title\"",
            "<meta property=\"og:description\"",
            "<meta property=\"og:url\" content=\"https://jirathip-dev.github.io/blocks/",
            "<meta name=\"twitter:card\"",
        ] {
            assert!(html.contains(want), "{f}: no {want}");
        }
        let js = if f == "playground.html" || f.starts_with("kind-") {
            "play.js"
        } else {
            "blocks.js"
        };
        assert!(
            html.contains(&format!("<script type=\"module\" src=\"{js}\">")),
            "{f}: no {js}"
        );
        for root in ["href=\"/", "src=\"/", "action=\"/"] {
            assert!(!html.contains(root), "{f}: {root}");
        }
        for href in html.split("href=\"").skip(1).filter_map(|s| s.split('"').next()) {
            let file = href.split('#').next().unwrap();
            let local = !href.starts_with("http") && !file.is_empty();
            assert!(!local || out.join(file).is_file(), "{f}: {href} goes nowhere");
        }
    }
}

#[test]
fn the_gallery_counts_every_kind_once_and_finds_its_fallback_group_from_the_renderer() {
    let out = build("gallery");
    let gallery = fs::read_to_string(out.join("gallery.html")).unwrap();
    let home = fs::read_to_string(out.join("index.html")).unwrap();
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("..");
    let mut fallback: Vec<String> = fs::read_dir(root.join("fixtures/html"))
        .unwrap()
        .map(|f| f.unwrap().path())
        .filter(|p| {
            let html = fs::read_to_string(p).unwrap();
            html.split('>').next().unwrap().contains("data-fallback")
        })
        .map(|p| p.file_stem().unwrap().to_string_lossy().into_owned())
        .collect();
    fallback.sort();
    assert_ne!(fallback, Vec::<String>::new());
    assert!(gallery.contains("All 37 core kinds"));
    assert!(gallery.contains("href=\"https://jirathip-dev.github.io/blocks/egui/\""));
    assert!(
        home.contains("<b class=\"b-stat__value\">37</b><span class=\"m\">core kinds"),
        "home's kind count"
    );
    let group = gallery
        .split(&format!("Fallback only, no HTML view yet · {}", fallback.len()))
        .nth(2)
        .unwrap();
    let mut marked: Vec<String> = group
        .split("data-id=\"fb-")
        .skip(1)
        .map(|s| s.split('"').next().unwrap().to_string())
        .collect();
    marked.sort();
    assert_eq!(marked, fallback);
    assert_eq!(
        gallery.matches(">No HTML view yet: this is its fallback<").count(),
        fallback.len()
    );
}

#[test]
fn the_layout_page_shows_its_layout_json_as_is_and_places_each_screen_on_both_sizes() {
    let out = build("layout");
    let html = fs::read_to_string(out.join("layout.html")).unwrap();
    let data = html.split("id=\"blocks-screen\"").nth(1).unwrap();
    let data = &data[data.find('>').unwrap() + 1..data.find("</script>").unwrap()];
    let screen: serde_json::Value = serde_json::from_str(data).unwrap();
    let file = include_str!("../layout.json").trim_end();
    assert!(serde_json::to_string(&screen)
        .unwrap()
        .contains(&serde_json::to_string(file).unwrap()));
    for tag in [
        "at-compact-strip-today",
        "at-wide-panel-today",
        "at-compact-strip-plants",
        "at-wide-column-plants",
        "at-compact-sheet-weather",
        "at-wide-cards-weather",
        "at-compact-menu-settings",
        "at-wide-menu-settings",
    ] {
        assert!(html.contains(&format!("data-id=\"{tag}\"")), "no {tag}");
    }
    assert!(html.contains("layout.json:14:24 · root.slots.main[0]: unknown place"));
}

fn screen_of(html: &str) -> serde_json::Value {
    let data = html.split("id=\"blocks-screen\"").nth(1).unwrap();
    serde_json::from_str(&data[data.find('>').unwrap() + 1..data.find("</script>").unwrap()]).unwrap()
}

fn block<'a>(v: &'a serde_json::Value, id: &str) -> Option<&'a serde_json::Value> {
    if v.get("id").and_then(serde_json::Value::as_str) == Some(id) {
        return Some(v);
    }
    match v {
        serde_json::Value::Object(o) => o.values().find_map(|x| block(x, id)),
        serde_json::Value::Array(a) => a.iter().find_map(|x| block(x, id)),
        _ => None,
    }
}

fn playground() -> (PathBuf, Vec<serde_json::Value>) {
    let out = build("playground");
    let html = fs::read_to_string(out.join("playground.html")).unwrap();
    let play = block(&screen_of(&html), "play").unwrap().clone();
    (out, play["props"]["samples"].as_array().unwrap().clone())
}

#[test]
fn the_playground_picks_home_and_every_kind_and_each_kind_page_links_to_it() {
    let (out, samples) = playground();
    let html = fs::read_to_string(out.join("playground.html")).unwrap();
    let names: Vec<&str> = samples.iter().map(|s| s["name"].as_str().unwrap()).collect();
    let want: Vec<&str> = std::iter::once("home")
        .chain(blocks::Block::KINDS.iter().copied())
        .collect();
    assert_eq!(names.len(), 38);
    for k in &want {
        assert!(names.contains(k), "no {k} sample");
        assert!(
            html.contains(&format!("href=\"playground.html#k={k}\"")),
            "the picker has no {k}"
        );
    }
    for k in blocks::Block::KINDS {
        let page = fs::read_to_string(out.join(format!("kind-{k}.html"))).unwrap();
        assert!(
            page.contains(&format!("href=\"playground.html#k={k}\"")),
            "kind-{k}: no playground link"
        );
    }
}

#[test]
fn each_rust_tab_is_the_source_function_that_builds_the_sample_line_for_line() {
    let (out, samples) = playground();
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("..");
    for s in samples.iter().filter(|s| s["name"] != "home") {
        let name = s["name"].as_str().unwrap();
        let cuts = s["rust"].as_array().unwrap();
        assert!(!cuts.is_empty(), "{name}: no Rust");
        let json: serde_json::Value = serde_json::from_str(s["json"].as_str().unwrap()).unwrap();
        let kind = fs::read_to_string(out.join(format!("kind-{name}.html"))).unwrap();
        let rust = serde_json::to_string(block(&screen_of(&kind), "rust").unwrap()).unwrap();
        for b in json["blocks"].as_array().unwrap() {
            let id = format!("\"{}\"", b["id"].as_str().unwrap());
            assert!(
                cuts.iter().any(|c| c["code"].as_str().unwrap().contains(&id)),
                "{name}: no cut has {id}"
            );
        }
        for c in cuts {
            let src = fs::read_to_string(root.join(c["file"].as_str().unwrap())).unwrap();
            let lines: Vec<&str> = src.lines().collect();
            let at = |k: &str| usize::try_from(c[k].as_u64().unwrap()).unwrap();
            let (from, to) = (at("from"), at("to"));
            let code = c["code"].as_str().unwrap();
            assert_eq!(
                lines[from - 1..to].join("\n"),
                code,
                "{name}: {}:{from} drifted from the source",
                c["file"]
            );
            assert!(
                lines[from - 1].contains("fn ") && lines[to - 1] == "}",
                "{name}: not a whole fn"
            );
            assert!(
                rust.contains(&serde_json::to_string(code).unwrap()),
                "{name}: the kind page shows other Rust"
            );
        }
    }
}

#[test]
fn each_json_tab_is_the_screen_blocks_site_writes() {
    let (out, samples) = playground();
    for s in &samples {
        let name = s["name"].as_str().unwrap();
        let text = s["json"].as_str().unwrap();
        let json: serde_json::Value = serde_json::from_str(text).unwrap();
        if name == "home" {
            assert_eq!(json, screen_of(&fs::read_to_string(out.join("index.html")).unwrap()));
            continue;
        }
        let kind = screen_of(&fs::read_to_string(out.join(format!("kind-{name}.html"))).unwrap());
        assert_eq!(
            json["blocks"],
            block(&kind, "spec").unwrap()["blocks"],
            "{name}: other blocks than drawn"
        );
        let listing = &block(&kind, "json").unwrap()["parts"][0]["text"];
        assert_eq!(listing.as_str(), Some(text), "{name}: the kind page's JSON tab differs");
    }
}
