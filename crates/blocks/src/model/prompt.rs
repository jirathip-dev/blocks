use std::collections::BTreeMap;

use crate::catalog::cards::{KINDS, PARTS};
use crate::catalog::{Catalog, Slot};

const HEAD: &str =
    "Reply with one JSON object {\"blocks\": Block[]} and nothing else: no prose around it, no code fence.\n\
Write no `id`. Write text as markdown in a `prose` block. Use only the kinds and fields below.\n\
An `action` is one of its kind's `sends`, spelt as written.";

fn starts(what: &str, list: &[String], none: &str) -> String {
    if list.is_empty() {
        format!(" {none}")
    } else {
        format!(" {what} may start with: {}.", list.join(", "))
    }
}

fn quoted(list: &[String]) -> String {
    list.iter().map(|a| format!("{a:?}")).collect::<Vec<_>>().join(" | ")
}

/// The catalog as a system prompt's text: its kinds and fields as type lines, the parts they name, its example.
pub fn prompt(catalog: &Catalog) -> String {
    let mut out = String::from(HEAD);
    out.push_str(&starts("A link", &catalog.links, "Write no link."));
    out.push_str(&starts("A file", &catalog.media, "No file is loaded."));
    out.push_str("\n\nA Block is one of:\n");
    let mut todo: Vec<&str> = vec![];
    for card in KINDS {
        let Some(allow) = catalog.kinds.get(card.kind) else {
            continue;
        };
        let offered = |s: &&Slot| {
            allow.fields.as_ref().is_none_or(|f| f.iter().any(|n| n == s.name))
                && (!s.sends || !allow.actions.is_empty())
        };
        out.push_str(&format!("{{type: {:?}", card.kind));
        for s in card.fields.iter().filter(offered) {
            todo.extend(s.names);
            out.push_str(&format!(", {}{}: {}", s.name, if s.need { "" } else { "?" }, s.ty));
        }
        out.push_str(&format!("}}  // {}", card.about));
        if !allow.actions.is_empty() {
            let dot = if card.about.ends_with('.') { "" } else { "." };
            out.push_str(&format!("{dot} sends: {}", quoted(&allow.actions)));
        }
        out.push('\n');
    }
    let inputs: Vec<&str> = PARTS
        .iter()
        .filter(|p| catalog.kinds.values().any(|a| a.inputs.iter().any(|i| i == p.input)))
        .map(|p| p.name)
        .collect();
    let mut parts = BTreeMap::new();
    while let Some(name) = todo.pop() {
        if parts.contains_key(name) {
            continue;
        }
        if name == "Field" {
            todo.extend(&inputs);
            parts.insert(name, inputs.join(" | "));
        } else if let Some(p) = PARTS.iter().find(|p| p.name == name) {
            todo.extend(p.names);
            parts.insert(name, p.line.into());
        }
    }
    if !parts.is_empty() {
        out.push_str("\nwhere\n");
    }
    for (name, line) in parts {
        out.push_str(&format!("{name} = {line}\n"));
    }
    if let Some(example) = &catalog.example {
        out.push_str(&format!("\nFor example:\n{example}\n"));
    }
    out
}
