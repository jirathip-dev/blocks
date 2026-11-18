use std::path::Path;

use serde_json::{json, Value};

use crate::{theme, Block, Body, Frame, Op, Row, Screen, SCHEMA_VERSION};

/// The JSON Schema of a `Frame`, the stream's one message type.
pub fn schema() -> Value {
    let mut v = schemars::schema_for!(Frame).to_value();
    if let Some(o) = v.as_object_mut() {
        let id = format!("https://github.com/jirathip-dev/blocks/schema/v{SCHEMA_VERSION}");
        o.insert("$id".into(), json!(id));
    }
    v
}

/// Writes every generated file under `root`, the repo's top folder.
pub fn write(root: &Path) -> std::io::Result<()> {
    let s = schema();
    let sample = serde_json::to_string_pretty(&sample())?;
    let files = [
        ("schema/blocks.schema.json", serde_json::to_string_pretty(&s)? + "\n"),
        ("schema/sample.json", format!("{sample}\n")),
        ("web/src/gen/types.ts", ts(&s).map_err(std::io::Error::other)?),
        (
            "web/src/gen/sample.ts",
            format!("import type {{ Frame }} from \"./types.ts\";\n\nexport const sample: Frame[] = {sample};\n"),
        ),
        (
            "swift/Sources/Blocks/Gen/Blocks.swift",
            swift(&s).map_err(std::io::Error::other)?,
        ),
        ("web/src/gen/schemes.ts", schemes_ts()?),
        ("swift/Sources/Blocks/Gen/Schemes.swift", schemes_swift()?),
    ];
    for (path, text) in files {
        std::fs::write(root.join(path), text)?;
    }
    Ok(())
}

fn schemes_ts() -> serde_json::Result<String> {
    let all: std::collections::BTreeMap<_, _> = theme::schemes().iter().map(|(n, s)| (*n, s)).collect();
    let tokens = theme::schemes()
        .first()
        .map(|(_, s)| s.tokens.all().map(|(k, _)| format!("\"{k}\"")).join(" | "))
        .unwrap_or_default();
    Ok(format!(
        "export type Mode = \"dark\" | \"light\";\n\nexport type Token = {tokens};\n\n\
         export type Scheme = {{ label: string; \"color-scheme\": Mode; tokens: Record<Token, string> }};\n\n\
         export const schemes: Record<string, Scheme> = {};\n",
        serde_json::to_string_pretty(&all)?
    ))
}

fn schemes_swift() -> serde_json::Result<String> {
    let q = |s: &str| serde_json::to_string(s);
    let mut out = String::from(
        "public enum SchemeMode: String, Codable, Equatable, Sendable {\n    case dark, light\n}\n\n\
         public struct Scheme: Equatable, Sendable {\n    public let label: String\n    public let mode: SchemeMode\n    \
         public let tokens: [String: String]\n}\n\npublic let blocksSchemes: [String: Scheme] = [\n",
    );
    for (name, s) in theme::schemes() {
        let mode = match s.mode {
            theme::Mode::Dark => "dark",
            theme::Mode::Light => "light",
        };
        let tokens = s
            .tokens
            .all()
            .iter()
            .map(|(k, v)| Ok(format!("{}: {}", q(k)?, q(v.as_str())?)))
            .collect::<serde_json::Result<Vec<_>>>()?
            .join(", ");
        out.push_str(&format!(
            "    {}: Scheme(label: {}, mode: .{mode}, tokens: [{tokens}]),\n",
            q(name)?,
            q(&s.label)?
        ));
    }
    out.push_str("]\n");
    Ok(out)
}

fn sample() -> Vec<Frame> {
    let row = |id: &str, block| Row { id: id.into(), block };
    let text = |t: &str| Block::Text { text: t.into() };
    let screen = Screen {
        rows: vec![row("title", text("Hello"))],
    };
    let button = Block::Button {
        label: "Go".into(),
        action: "go".into(),
    };
    vec![
        Frame {
            seq: 0,
            body: Body::Snapshot { screen },
        },
        Frame {
            seq: 1,
            body: Body::Ops {
                ops: vec![
                    Op::Insert {
                        at: 1,
                        row: row("go", button),
                    },
                    Op::Update {
                        row: row("title", text("Hi")),
                    },
                    Op::Remove { id: "go".into() },
                ],
            },
        },
    ]
}

fn types(s: &Value) -> Vec<(&str, &Value)> {
    let root = s.get("title").and_then(Value::as_str).map(|t| (t, s));
    let defs = s.get("$defs").and_then(Value::as_object).into_iter().flatten();
    root.into_iter().chain(defs.map(|(k, v)| (k.as_str(), v))).collect()
}

fn fields(o: &Value) -> Result<Vec<(&str, &Value)>, String> {
    let req: Vec<&str> = o
        .get("required")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .collect();
    let props = o
        .get("properties")
        .and_then(Value::as_object)
        .ok_or(format!("no properties in {o}"))?;
    props
        .iter()
        .map(|(k, v)| {
            if req.contains(&k.as_str()) {
                Ok((k.as_str(), v))
            } else {
                Err(format!("optional field `{k}`"))
            }
        })
        .collect()
}

type Variant<'a> = (&'a str, Vec<(&'a str, &'a Value)>);

fn variant(v: &Value) -> Result<Variant<'_>, String> {
    let one = fields(v)?;
    let [(name, body)] = one.as_slice() else {
        return Err(format!("variant with {} keys", one.len()));
    };
    Ok((*name, fields(body)?))
}

fn variants(s: &Value) -> Option<Result<Vec<Variant<'_>>, String>> {
    Some(s.get("oneOf")?.as_array()?.iter().map(variant).collect())
}

fn kind(p: &Value) -> Result<Kind<'_>, String> {
    if let Some(r) = p.get("$ref").and_then(Value::as_str) {
        return Ok(Kind::Named(r.trim_start_matches("#/$defs/")));
    }
    match (
        p.get("type").and_then(Value::as_str),
        p.get("format").and_then(Value::as_str),
    ) {
        (Some("string"), _) => Ok(Kind::String),
        (Some("boolean"), _) => Ok(Kind::Bool),
        (Some("integer"), Some("uint64")) => Ok(Kind::U64),
        (Some("integer"), _) => Ok(Kind::Int),
        (Some("array"), _) => Ok(Kind::Array(Box::new(kind(
            p.get("items").ok_or("array without items")?,
        )?))),
        _ => Err(format!("no generated type for {p}")),
    }
}

enum Kind<'a> {
    Named(&'a str),
    String,
    Bool,
    U64,
    Int,
    Array(Box<Kind<'a>>),
}

impl Kind<'_> {
    fn ts(&self) -> String {
        match self {
            Self::Named(n) => (*n).into(),
            Self::String => "string".into(),
            Self::Bool => "boolean".into(),
            Self::U64 | Self::Int => "number".into(),
            Self::Array(k) => format!("{}[]", k.ts()),
        }
    }

    fn swift(&self) -> String {
        match self {
            Self::Named(n) => (*n).into(),
            Self::String => "String".into(),
            Self::Bool => "Bool".into(),
            Self::U64 => "UInt64".into(),
            Self::Int => "Int".into(),
            Self::Array(k) => format!("[{}]", k.swift()),
        }
    }
}

type Out = Result<String, String>;

fn each<T>(items: &[T], f: impl Fn(&T) -> Out, sep: &str) -> Out {
    Ok(items.iter().map(f).collect::<Result<Vec<String>, String>>()?.join(sep))
}

fn ts(s: &Value) -> Out {
    let obj = |fs: &Vec<(&str, &Value)>| -> Out {
        let f = each(fs, |(k, v)| Ok(format!("{k}: {}", kind(v)?.ts())), "; ")?;
        Ok(format!("{{ {f} }}"))
    };
    let mut out = format!("export const schemaVersion = {SCHEMA_VERSION};\n");
    for (name, t) in types(s) {
        let body = if let Some(vs) = variants(t) {
            each(&vs?, |(v, fs)| Ok(format!("{{ {v}: {} }}", obj(fs)?)), " | ")?
        } else {
            obj(&fields(t)?)?
        };
        out.push_str(&format!("\nexport type {name} = {body};\n"));
    }
    Ok(out)
}

fn swift(s: &Value) -> Out {
    let arg = |(k, v): &(&str, &Value)| Ok(format!("{k}: {}", kind(v)?.swift()));
    let mut out = format!("public let blocksSchemaVersion = {SCHEMA_VERSION}\n");
    for (name, t) in types(s) {
        let (what, body) = if let Some(vs) = variants(t) {
            let case = |(v, fs): &Variant<'_>| Ok(format!("    case {v}({})", each(fs, arg, ", ")?));
            ("enum", each(&vs?, case, "\n")?)
        } else {
            (
                "struct",
                each(&fields(t)?, |f| Ok(format!("    public let {}", arg(f)?)), "\n")?,
            )
        };
        out.push_str(&format!(
            "\npublic {what} {name}: Codable, Equatable, Sendable {{\n{body}\n}}\n"
        ));
    }
    Ok(out)
}
