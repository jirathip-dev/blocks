use super::{Block, Field, Text, TextField};

pub(super) fn text(id: &str, markdown: &str) -> Block {
    Block::Text(Box::new(Text::new().id(id).markdown(markdown)))
}

pub(super) fn field(name: &str, label: &str) -> Field {
    TextField::new(name).label(label).into()
}

/// One typed sample per kind, keyed by its `type` (a table has two); `fixtures/blocks` is written from them.
pub fn samples() -> Vec<(&'static str, Block)> {
    let kind = |b: &Block| {
        let v = serde_json::to_value(b).ok()?;
        let t = v.get("type")?.as_str()?.to_string();
        Block::KINDS.iter().copied().find(|k| *k == t)
    };
    super::core::samples()
        .into_iter()
        .filter_map(|b| Some((kind(&b)?, b)))
        .collect()
}

/// Each sample with its fixture name: its kind, or `kind-id` for a kind's later samples.
pub fn fixtures() -> Vec<(String, Block)> {
    let mut seen: Vec<&str> = vec![];
    let mut out = vec![];
    for (kind, b) in samples() {
        let name = match b.id() {
            Some(id) if seen.contains(&kind) => format!("{kind}-{id}"),
            _ => kind.to_string(),
        };
        seen.push(kind);
        out.push((name, b));
    }
    out
}
