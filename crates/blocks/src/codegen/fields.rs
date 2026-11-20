use std::path::Path;

use serde_json::Value;

use super::Files;
use crate::{tree, Block, Built, Field, Form, Lang, Locale, Screen};

const STATES: [(&str, &str); 4] = [
    ("error", "Check this one"),
    ("was", "the old value"),
    ("doc", "A line that says what it is for"),
    (
        "label",
        "A label long enough to wrap onto a second line on a phone held upright",
    ),
];

pub(super) fn files(root: &Path) -> std::io::Result<Files> {
    let names = drawn(root)?;
    let types: Vec<&str> = names.iter().map(String::as_str).collect();
    let mut out = words();
    out.push(views(&types));
    for f in Field::samples() {
        let filled = serde_json::to_value(&f)?;
        let kind = filled
            .get("type")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string();
        let screen = Built::of(&screen(&kind, &filled)?);
        let tree = tree::expect_fields(&screen, Block::KINDS, &types, &crate::behave::start(&screen));
        out.push((format!("fixtures/fields/{kind}.json"), pretty(screen.value())?));
        out.push((format!("fixtures/fields/trees/{kind}.json"), pretty(&tree)?));
    }
    Ok(out)
}

fn pretty(v: &impl serde::Serialize) -> std::io::Result<String> {
    Ok(serde_json::to_string_pretty(v)? + "\n")
}

fn screen(kind: &str, filled: &Value) -> std::io::Result<Screen> {
    let name = filled.get("name").and_then(Value::as_str).unwrap_or_default();
    let mut empty = filled.clone();
    if let Some(o) = empty.as_object_mut() {
        o.retain(|k, _| ["type", "name", "label", "options"].contains(&k.as_str()));
        o.insert("name".into(), format!("{name}-empty").into());
    }
    let mut fields = vec![empty, filled.clone()];
    for (key, text) in STATES {
        let mut f = filled.clone();
        if let Some(o) = f.as_object_mut() {
            o.insert(key.into(), text.into());
            o.insert("name".into(), format!("{name}-{key}").into());
        }
        fields.push(f);
    }
    let fields: Vec<Field> = serde_json::from_value(Value::Array(fields))?;
    let form = Form::new(fields).id(kind);
    let locale = Locale {
        lang: Some(Lang::En),
        ..Locale::default()
    };
    Ok(Screen::new()
        .id(format!("fields-{kind}"))
        .locale(locale)
        .blocks(vec![Block::Form(Box::new(form))]))
}

fn drawn(root: &Path) -> std::io::Result<Vec<String>> {
    let mut types = vec![];
    for f in std::fs::read_dir(root.join("web/src/render/field"))? {
        let name = f?.file_name().to_string_lossy().into_owned();
        types.extend(
            name.strip_suffix(".ts")
                .filter(|t| !t.starts_with('_'))
                .map(String::from),
        );
    }
    types.sort();
    Ok(types)
}

fn views(types: &[&str]) -> (String, String) {
    let mut ts = String::from("import type { FieldView } from \"../render/field/_view.ts\";\n");
    for t in types {
        ts += &format!("import {{ {t} }} from \"../render/field/{t}.ts\";\n");
    }
    ts += &format!(
        "\nexport const views: Record<string, FieldView | undefined> = {{ {} }};\n",
        types.join(", ")
    );
    ("web/src/gen/fields.ts".into(), ts)
}

fn words() -> Files {
    let all: Vec<_> = Field::WORDS.iter().flat_map(|ws| ws.iter()).collect();
    let ts: String = all
        .iter()
        .map(|(k, en, th)| format!("  {k}: [\"{en}\", \"{th}\"],\n"))
        .collect();
    let swift: String = all
        .iter()
        .map(|(k, en, th)| format!("    \"{k}\": (en: \"{en}\", th: \"{th}\"),\n"))
        .collect();
    vec![
        (
            "web/src/gen/words.ts".into(),
            format!("export const words: Record<string, [en: string, th: string]> = {{\n{ts}}};\n"),
        ),
        (
            "swift/Sources/Blocks/Gen/Words.swift".into(),
            format!("/// Every word a field draws itself, by key.\npublic let fieldWords: [String: (en: String, th: String)] = [\n{swift}]\n"),
        ),
    ]
}
