use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

fn build() -> PathBuf {
    let out = Path::new(env!("CARGO_TARGET_TMPDIR")).join("showcase");
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
    let out = build();
    let all = pages(&out);
    assert_eq!(all.len(), 4 + 27);
    for (f, html) in &all {
        for want in [
            "<title>",
            "<meta name=\"description\" content=\"",
            "<meta property=\"og:title\"",
            "<meta property=\"og:description\"",
            "<meta property=\"og:url\" content=\"https://jirathip-dev.github.io/blocks/",
            "<meta name=\"twitter:card\"",
            "<script type=\"module\" src=\"blocks.js\">",
        ] {
            assert!(html.contains(want), "{f}: no {want}");
        }
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
    let out = build();
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
    assert!(gallery.contains("All 27 core kinds"));
    assert!(
        home.contains("<b class=\"b-stat__value\">27</b><span class=\"m\">core kinds"),
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
