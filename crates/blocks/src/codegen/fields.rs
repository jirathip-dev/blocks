use std::path::Path;

use serde_json::Value;

use super::Files;
use crate::kind::Word;
use crate::{site, tree, Block, Built, Field, Form, Import, Lang, Locale, Screen, Submit, ToggleField, ToggleLook};

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
    let names = drawn(root, "web/src/render/field", ".ts")?;
    let types: Vec<&str> = names.iter().map(String::as_str).collect();
    let mut out = words();
    out.push(views("web/src/gen/fields.ts", "../render/field", &types));
    let react = drawn(root, "web/react/src/fields", ".ts")?;
    let react: Vec<&str> = react.iter().map(String::as_str).collect();
    out.push(views("web/react/src/gen/fields.ts", "../fields", &react));
    let swift = drawn(root, "swift/Sources/BlocksUI/Field", "Field.swift")?;
    let swift: Vec<&str> = swift.iter().map(String::as_str).collect();
    let check = ToggleField::sample().look(ToggleLook::Check);
    for f in Field::samples().into_iter().chain([check.into()]) {
        let filled = serde_json::to_value(&f)?;
        let text = |k| filled.get(k).and_then(Value::as_str);
        let kind = text("type").unwrap_or_default();
        let kind = text("as").map_or_else(|| kind.to_string(), |a| format!("{kind}-{a}"));
        let screen = Built::of(&screen(&kind, &filled)?);
        let start = crate::behave::start(&screen);
        let tree = tree::expect_fields(&screen, Block::KINDS, &types, &start);
        let plain = tree::expect_fields(&screen, Block::KINDS, &swift, &start);
        out.push((format!("fixtures/fields/{kind}.json"), pretty(screen.value())?));
        out.push((format!("fixtures/fields/trees/{kind}.json"), pretty(&tree)?));
        out.push((format!("fixtures/trees/swift/fields/{kind}.json"), pretty(&plain)?));
        out.push((
            format!("fixtures/fields/html/{kind}.html"),
            site::fragment(&screen, "/act") + "\n",
        ));
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
        let need: &[&str] = if kind == "slider" { &["min", "max"] } else { &[] };
        o.retain(|k, _| ["type", "name", "label", "options", "as"].contains(&k.as_str()) || need.contains(&k.as_str()));
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
    let send = Submit {
        label: "send".into(),
        action: "send".into(),
        ..Submit::default()
    };
    let form = Form::new(fields).id(kind).submit(send);
    let locale = Locale {
        lang: Some(Lang::En),
        ..Locale::default()
    };
    Ok(Screen::new()
        .id(format!("fields-{kind}"))
        .locale(locale)
        .blocks(vec![Block::Form(Box::new(form))]))
}

fn drawn(root: &Path, dir: &str, suffix: &str) -> std::io::Result<Vec<String>> {
    let mut types = vec![];
    for f in std::fs::read_dir(root.join(dir))? {
        let name = f?.file_name().to_string_lossy().into_owned();
        types.extend(
            name.strip_suffix(suffix)
                .filter(|t| !t.is_empty() && !t.starts_with('_'))
                .map(str::to_lowercase),
        );
    }
    types.sort();
    Ok(types)
}

fn views(file: &str, dir: &str, types: &[&str]) -> (String, String) {
    let mut ts = format!("import type {{ FieldView }} from \"{dir}/_view.ts\";\n");
    for t in types {
        ts += &format!("import {{ {t} }} from \"{dir}/{t}.ts\";\n");
    }
    ts += &format!(
        "\nexport const views: Record<string, FieldView | undefined> = {{ {} }};\n",
        types.join(", ")
    );
    (file.into(), ts)
}

fn words() -> Files {
    let all: Vec<_> = Field::WORDS
        .iter()
        .flat_map(|ws| ws.iter())
        .chain(Import::WORDS)
        .collect();
    let ts = |ws: &[&Word]| -> String {
        ws.iter()
            .map(|(k, en, th)| format!("  {k}: [\"{en}\", \"{th}\"],\n"))
            .collect()
    };
    let (fields, import) = all.split_at(all.len() - Import::WORDS.len());
    let swift: String = all
        .iter()
        .map(|(k, en, th)| format!("    \"{k}\": (en: \"{en}\", th: \"{th}\"),\n"))
        .collect();
    vec![
        (
            "web/src/gen/words.ts".into(),
            format!("export const words: Record<string, [en: string, th: string]> = {{\n{}}};\n", ts(fields)),
        ),
        (
            "web/src/gen/words-import.ts".into(),
            format!("export const importWords: Record<string, [en: string, th: string]> = {{\n{}}};\n", ts(import)),
        ),
        (
            "swift/Sources/Blocks/Gen/Words.swift".into(),
            format!("/// Every word a field draws itself, by key.\npublic let fieldWords: [String: (en: String, th: String)] = [\n{swift}]\n"),
        ),
    ]
}
