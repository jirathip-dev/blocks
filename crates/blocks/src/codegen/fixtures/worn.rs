use std::collections::{BTreeMap, BTreeSet};
use std::io::{Error, ErrorKind};

use serde::Serialize;

use super::Files;
use crate::theme::{Finish, LabelRole, AXES};

const VOID: [&str; 8] = ["br", "hr", "img", "input", "link", "meta", "source", "wbr"];

fn attr<'t>(tag: &'t str, name: &str) -> Option<&'t str> {
    let at = tag.find(&format!(" {name}=\""))? + name.len() + 3;
    tag.get(at..).and_then(|rest| rest.split('"').next())
}

fn wears(file: &str, html: &str, kinds: &mut BTreeMap<String, BTreeSet<&'static str>>) -> std::io::Result<()> {
    let mut open: Vec<Option<String>> = vec![];
    for piece in html.split('<').skip(1) {
        let tag = piece.split('>').next().unwrap_or_default();
        if tag.starts_with('/') {
            open.pop();
            continue;
        }
        let name = tag.split([' ', '/']).next().unwrap_or_default();
        let classes: Vec<&str> = attr(tag, "class").unwrap_or_default().split(' ').collect();
        open.push(attr(tag, "data-block").map(String::from));
        let Some(kind) = open.iter().rev().find_map(Option::as_ref) else {
            continue;
        };
        let mut worn: Vec<Finish> = vec![];
        for name in classes.iter().filter_map(|c| c.strip_prefix("as-")) {
            let f = Finish::named(name)
                .filter(|f| f.selector() == Some(&*format!(".as-{name}")))
                .ok_or_else(|| {
                    Error::new(
                        ErrorKind::InvalidData,
                        format!("{file}: `as-{name}` is no finish a part wears"),
                    )
                })?;
            worn.push(f);
        }
        if name == "button" || (name == "a" && classes.contains(&"btn")) {
            worn.push(Finish::Button);
        }
        kinds
            .entry(kind.clone())
            .or_default()
            .extend(worn.iter().map(|f| f.name()));
        if VOID.contains(&name) || tag.ends_with('/') {
            open.pop();
        }
    }
    Ok(())
}

fn names(fs: impl IntoIterator<Item = Finish>) -> BTreeSet<&'static str> {
    fs.into_iter().map(Finish::name).collect()
}

#[derive(Serialize)]
struct Worn {
    kinds: BTreeMap<String, BTreeSet<&'static str>>,
    values: BTreeMap<&'static str, BTreeMap<&'static str, BTreeSet<&'static str>>>,
}

pub(super) fn file(out: &Files) -> std::io::Result<(String, String)> {
    let mut kinds = BTreeMap::new();
    for (path, html) in out
        .iter()
        .filter(|(p, _)| p.starts_with("fixtures/html/") || p.starts_with("fixtures/fields/html/"))
    {
        wears(path, html, &mut kinds)?;
    }
    let mut values: BTreeMap<_, BTreeMap<_, _>> = AXES
        .iter()
        .map(|a| {
            let all = names(a.values.iter().flat_map(|(_, rows)| rows.iter().map(|r| r.on)));
            let each = a.values.iter().enumerate().map(|(i, (v, rows))| {
                let own = names(rows.iter().map(|r| r.on));
                (*v, if i > 0 && own.is_empty() { all.clone() } else { own })
            });
            (a.name, each.collect())
        })
        .collect();
    let labels = LabelRole::ALL.iter().map(|r| {
        let f = Finish::Label(*r);
        (f.name().trim_end_matches("-label"), names([f]))
    });
    values.insert("labels", labels.collect());
    let text = serde_json::to_string_pretty(&Worn { kinds, values })?;
    Ok(("fixtures/look/worn.json".into(), text + "\n"))
}
