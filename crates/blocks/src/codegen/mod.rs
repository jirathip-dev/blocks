use std::path::Path;

use serde_json::{Map, Value};

use crate::{guard, tree, Action, Answer, Block, Bye, Frame, Hello, OldFrame, Sync, Synced, SCHEMA_VERSION};

mod builders;
mod fixtures;
mod hooks;
mod model;
mod rules;
mod skill;
mod swift;
mod theme;
mod ts;

type Files = Vec<(String, String)>;

/// The JSON Schema of a `Frame`; its `$defs` hold `Block`, `Op` and the stream's other messages.
pub fn schema() -> Value {
    let mut g = schemars::SchemaGenerator::default();
    g.subschema_for::<Action>();
    g.subschema_for::<Answer>();
    g.subschema_for::<Hello>();
    g.subschema_for::<Bye>();
    g.subschema_for::<Sync>();
    g.subschema_for::<Synced>();
    g.subschema_for::<OldFrame>();
    g.subschema_for::<tree::Report>();
    g.subschema_for::<tree::Step>();
    g.subschema_for::<tree::Node>();
    g.subschema_for::<guard::Seen>();
    g.subschema_for::<guard::Finding>();
    g.subschema_for::<guard::Plan>();
    let mut v = g.into_root_schema_for::<Frame>().to_value();
    if let Some(o) = v.as_object_mut() {
        let id = format!("https://github.com/jirathip-dev/blocks/schema/v{SCHEMA_VERSION}");
        o.insert("$id".into(), Value::String(id));
    }
    if let Some(kind) = v
        .pointer_mut("/$defs/AppBlock/properties/type")
        .and_then(Value::as_object_mut)
    {
        let core = Block::KINDS.iter().map(|k| Value::String((*k).into())).collect();
        kind.insert(
            "not".into(),
            Value::Object(Map::from_iter([("enum".into(), Value::Array(core))])),
        );
    }
    v
}

/// Writes every generated file under `root`, the repo's top folder.
pub fn write(root: &Path) -> std::io::Result<()> {
    let schema = schema();
    for area in [
        skill::files,
        model::files,
        ts::files,
        builders::files,
        swift::files,
        hooks::files,
        theme::files,
        fixtures::files,
        rules::files,
    ] {
        for (path, text) in area(root, &schema)? {
            let path = root.join(path);
            if let Some(dir) = path.parent() {
                std::fs::create_dir_all(dir)?;
            }
            std::fs::write(path, text)?;
        }
    }
    Ok(())
}
