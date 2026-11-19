use std::path::Path;

use serde_json::{Map, Value};

use crate::{
    layout, theme, Action, Answer, Block, Bye, Card, Child, Composer, ComposerChip, Frame, Hello, List, OldFrame, Op,
    Queued, Row, Screen, Sync, Synced, Text, Tone, SCHEMA_VERSION,
};

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
    let s = schema();
    let sample = serde_json::to_string_pretty(&sample())?;
    let files = [
        ("schema/blocks.schema.json", serde_json::to_string_pretty(&s)? + "\n"),
        ("schema/sample.json", format!("{sample}\n")),
        ("web/src/gen/types.ts", ts(&s).map_err(std::io::Error::other)?),
        (
            "web/src/gen/sample.ts",
            format!("import type {{ OldFrame }} from \"./types.ts\";\n\nexport const sample: OldFrame[] = {sample};\n"),
        ),
        (
            "swift/Sources/Blocks/Gen/Blocks.swift",
            swift(&s).map_err(std::io::Error::other)?,
        ),
        ("web/src/gen/hooks.ts", hooks(&s).map_err(std::io::Error::other)?),
        ("web/src/gen/schemes.ts", schemes_ts()?),
        ("swift/Sources/Blocks/Gen/Schemes.swift", schemes_swift()?),
        (
            "swift/Sources/Blocks/Gen/Style.swift",
            style_swift().map_err(std::io::Error::other)?,
        ),
        ("web/src/gen/layout.ts", layout_ts().map_err(std::io::Error::other)?),
        (
            "swift/Sources/Blocks/Gen/LayoutShapes.swift",
            layout_swift().map_err(std::io::Error::other)?,
        ),
    ];
    for (path, text) in files {
        std::fs::write(root.join(path), text)?;
    }
    std::fs::create_dir_all(root.join("fixtures/blocks"))?;
    for (kind, b) in crate::samples() {
        let text = serde_json::to_string_pretty(&b)? + "\n";
        std::fs::write(root.join(format!("fixtures/blocks/{kind}.json")), text)?;
    }
    Ok(())
}

const PARTS: [&str; 5] = ["title", "subtitle", "badge", "value", "figure"];
const ACTIONS: [&str; 4] = ["actions", "buttons", "menu", "swipe"];
const VARIANTS: [(&str, &str); 5] = [
    ("row", "style"),
    ("card", "kind"),
    ("button", "style"),
    ("text", "style"),
    ("images", "size"),
];

fn hooks(s: &Value) -> Out {
    let all = defs(s)?;
    let Some((_, Def::Tagged { cases, .. })) = all.iter().find(|(k, _)| *k == "Block") else {
        return Err("no Block in the schema".into());
    };
    let mut out = String::from(
        "import type { Kind } from \"./types.ts\";\n\nexport type Hook = { variant: string | null; parts: readonly string[] };\n\n\
         export const hooks: Record<Kind, Hook> = {\n",
    );
    for (kind, case) in cases {
        let Case::Ref(n) = case else { continue };
        let props = all.iter().find(|(k, _)| k == n).map(|(_, d)| d);
        let names: Vec<&str> = match props {
            Some(Def::Struct(ps)) => ps.iter().map(|p| p.name).collect(),
            _ => vec![],
        };
        let mut parts: Vec<&str> = PARTS.into_iter().filter(|p| names.contains(p)).collect();
        if ACTIONS.iter().any(|a| names.contains(a)) {
            parts.push("actions");
        }
        let variant = VARIANTS
            .iter()
            .find(|(k, _)| k == kind)
            .map_or("null".into(), |(_, v)| format!("\"{v}\""));
        let parts = parts.iter().map(|p| format!("\"{p}\"")).collect::<Vec<_>>().join(", ");
        out.push_str(&format!("    {kind}: {{ variant: {variant}, parts: [{parts}] }},\n"));
    }
    out.push_str("};\n");
    Ok(out)
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

fn style_swift() -> Out {
    let style = swift_defs(&schemars::schema_for!(theme::Style).to_value())?;
    Ok(style + &swift_defs(&schemars::schema_for!(theme::LabelRole).to_value())?)
}

fn layout_ts() -> Out {
    let place = ts_defs(&schemars::schema_for!(layout::Place).to_value())?;
    Ok(place + &ts_defs(&schemars::schema_for!(layout::Transition).to_value())?)
}

fn layout_swift() -> Out {
    let place = swift_defs(&schemars::schema_for!(layout::Place).to_value())?;
    Ok(place + &swift_defs(&schemars::schema_for!(layout::Transition).to_value())?)
}

fn row(id: &str, title: &str) -> Block {
    Block::Row(Box::new(Row {
        id: Some(id.into()),
        title: title.into(),
        ..Row::default()
    }))
}

fn sample() -> Vec<OldFrame> {
    let say = Composer {
        id: Some("say".into()),
        action: "thread-say".into(),
        placeholder: Some("message the orchestrator".into()),
        chips: Some(vec![ComposerChip {
            name: "effort".into(),
            cur: None,
            all: vec!["low".into(), "high".into()],
        }]),
        queued: Some(vec![Queued {
            q: 1,
            text: "and the tests".into(),
        }]),
        ..Composer::default()
    };
    let note = Text {
        id: Some("note".into()),
        markdown: Some("**Hello**".into()),
        ..Text::default()
    };
    let list = List {
        id: Some("l".into()),
        rows: vec![row("a", "first"), row("b", "second")],
        ..List::default()
    };
    let screen = Screen {
        id: Some("s".into()),
        title: Some("Thread".into()),
        blocks: Some(vec![
            Block::Text(Box::new(note)),
            Block::List(Box::new(list)),
            Block::Composer(Box::new(say)),
        ]),
        ..Screen::default()
    };
    let card = Card {
        id: Some("c".into()),
        tone: Some(Tone::Warn),
        title: Some("q1".into()),
        ..Card::default()
    };
    let insert = |before: Option<&str>, after: Option<&str>, b: Block| Op::Insert {
        into: "l".into(),
        before: before.map(Into::into),
        after: after.map(Into::into),
        block: Child::Block(b),
    };
    let fields = Map::from_iter([("subtitle".into(), Value::String("now".into()))]);
    let ops = vec![
        insert(Some("a"), None, row("c", "before a")),
        insert(None, Some("a"), row("d", "after a")),
        Op::Merge { id: "b".into(), fields },
        Op::Move {
            id: "b".into(),
            into: "l".into(),
            before: Some("c".into()),
        },
        Op::Replace {
            id: "note".into(),
            block: Block::Card(Box::new(card)),
        },
        Op::Remove { id: "d".into() },
        Op::Badge { count: 2 },
        Op::Dot { on: true },
    ];
    vec![
        OldFrame {
            seq: 0,
            ops: vec![Op::Screen {
                screen: Block::Screen(Box::new(screen)),
            }],
        },
        OldFrame { seq: 1, ops },
    ]
}

enum Ty<'a> {
    Null,
    Str,
    Bool,
    Int(&'a str),
    Num,
    Json,
    List(Box<Ty<'a>>),
    Map(Box<Ty<'a>>),
    Named(&'a str),
}

struct Prop<'a> {
    name: &'a str,
    ty: Ty<'a>,
    opt: bool,
}

enum Case<'a> {
    Ref(&'a str),
    Props(Vec<Prop<'a>>),
}

enum Def<'a> {
    Struct(Vec<Prop<'a>>),
    Words(Vec<&'a str>),
    Tagged {
        tag: &'a str,
        cases: Vec<(&'a str, Case<'a>)>,
        rest: Option<&'a str>,
    },
    Union(Vec<Ty<'a>>),
    Keyed(Vec<(&'a str, Ty<'a>)>, Option<&'a str>),
}

fn keyed(a: &Value) -> Option<(&str, &Value)> {
    let ps = a.get("properties")?.as_object()?;
    match (ps.iter().next(), a.get("additionalProperties")) {
        (Some((k, v)), Some(Value::Bool(false))) if ps.len() == 1 => Some((k.as_str(), v)),
        _ => None,
    }
}

fn keyed_def(alts: &[Value]) -> Result<Option<Def<'_>>, String> {
    let (mut cases, mut rest) = (vec![], None);
    for a in alts {
        match (keyed(a), named(a)) {
            (Some((k, v)), _) => cases.push((k, ty(v)?.0)),
            (None, Some(n)) if rest.is_none() => rest = Some(n),
            _ => return Ok(None),
        }
    }
    Ok(Some(Def::Keyed(cases, rest)))
}

type Out = Result<String, String>;

fn alts(v: &Value) -> Option<&Vec<Value>> {
    v.get("oneOf").or_else(|| v.get("anyOf"))?.as_array()
}

fn named(v: &Value) -> Option<&str> {
    v.get("$ref")?.as_str()?.strip_prefix("#/$defs/")
}

fn ty(p: &Value) -> Result<(Ty<'_>, bool), String> {
    if p == &Value::Bool(true) {
        return Ok((Ty::Json, false));
    }
    if let Some(n) = named(p) {
        return Ok((Ty::Named(n), false));
    }
    if let Some([x, null]) = alts(p).map(Vec::as_slice) {
        if null.get("type").and_then(Value::as_str) == Some("null") {
            return Ok((ty(x)?.0, true));
        }
    }
    let types: Vec<&str> = match p.get("type") {
        Some(Value::String(t)) => vec![t],
        Some(Value::Array(ts)) => ts.iter().filter_map(Value::as_str).collect(),
        _ => return Err(format!("no generated type for {p}")),
    };
    let null = types.contains(&"null");
    let t = match types.iter().find(|t| **t != "null") {
        None if null => return Ok((Ty::Null, false)),
        Some(&"string") => Ty::Str,
        Some(&"boolean") => Ty::Bool,
        Some(&"number") => Ty::Num,
        Some(&"integer") => Ty::Int(p.get("format").and_then(Value::as_str).unwrap_or("")),
        Some(&"array") => Ty::List(Box::new(ty(p.get("items").ok_or("an array without items")?)?.0)),
        Some(&"object") => Ty::Map(Box::new(match p.get("additionalProperties") {
            Some(a @ Value::Object(_)) => ty(a)?.0,
            _ => Ty::Json,
        })),
        _ => return Err(format!("no generated type for {p}")),
    };
    Ok((t, null))
}

fn props<'a>(o: &'a Value, skip: &str) -> Result<Vec<Prop<'a>>, String> {
    let req: Vec<&str> = o
        .get("required")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .collect();
    let all = o.get("properties").and_then(Value::as_object).into_iter().flatten();
    all.filter(|(k, _)| k.as_str() != skip)
        .map(|(k, v)| {
            let (ty, null) = ty(v)?;
            let opt = null || !req.contains(&k.as_str());
            Ok(Prop { name: k, ty, opt })
        })
        .collect()
}

fn tag_of(alt: &Value) -> Option<(&str, &str)> {
    let ps = alt.get("properties")?.as_object()?;
    ps.iter()
        .find_map(|(k, v)| Some((k.as_str(), v.get("const")?.as_str()?)))
}

fn def(v: &Value) -> Result<Def<'_>, String> {
    if let Some(words) = v.get("enum").and_then(Value::as_array) {
        return Ok(Def::Words(words.iter().filter_map(Value::as_str).collect()));
    }
    let Some(alts) = alts(v) else {
        return Ok(Def::Struct(props(v, "")?));
    };
    if let [w, s] = alts.as_slice() {
        if w.get("enum").is_some() && s.get("type").and_then(Value::as_str) == Some("string") {
            return def(w);
        }
    }
    let Some(tag) = alts.iter().find_map(tag_of).map(|t| t.0) else {
        if let Some(k) = keyed_def(alts)? {
            return Ok(k);
        }
        return Ok(Def::Union(
            alts.iter().map(|a| ty(a).map(|t| t.0)).collect::<Result<_, _>>()?,
        ));
    };
    let (mut cases, mut rest) = (vec![], None);
    for a in alts {
        match (tag_of(a), named(a)) {
            (Some((_, c)), Some(n)) => cases.push((c, Case::Ref(n))),
            (Some((_, c)), None) => cases.push((c, Case::Props(props(a, tag)?))),
            (None, Some(n)) => rest = Some(n),
            (None, None) => return Err(format!("an untagged case in {v}")),
        }
    }
    Ok(Def::Tagged { tag, cases, rest })
}

fn defs(s: &Value) -> Result<Vec<(&str, Def<'_>)>, String> {
    let root = s.get("title").and_then(Value::as_str).map(|t| (t, s));
    let all = s.get("$defs").and_then(Value::as_object).into_iter().flatten();
    root.into_iter()
        .chain(all.map(|(k, v)| (k.as_str(), v)))
        .map(|(k, v)| Ok((k, def(v)?)))
        .collect()
}

fn camel(s: &str, upper: bool) -> String {
    let mut out = String::new();
    for (i, part) in s.split(['-', '_']).enumerate() {
        let mut cs = part.chars();
        if let Some(c) = cs.next() {
            let up = upper || i > 0;
            out.extend(if up {
                c.to_uppercase().collect::<Vec<_>>()
            } else {
                c.to_lowercase().collect()
            });
            out.extend(cs);
        }
    }
    out
}

impl Ty<'_> {
    fn ts(&self) -> String {
        match self {
            Self::Null => "null".into(),
            Self::Str => "string".into(),
            Self::Bool => "boolean".into(),
            Self::Int(_) | Self::Num => "number".into(),
            Self::Json => "unknown".into(),
            Self::List(t) => format!("{}[]", t.ts()),
            Self::Map(t) => format!("Record<string, {}>", t.ts()),
            Self::Named(n) => (*n).into(),
        }
    }

    fn swift(&self) -> String {
        match self {
            Self::Str => "String".into(),
            Self::Bool => "Bool".into(),
            Self::Int("uint64") => "UInt64".into(),
            Self::Int("uint32") => "UInt32".into(),
            Self::Int("uint8") => "UInt8".into(),
            Self::Int("int64") => "Int64".into(),
            Self::Int(_) => "Int".into(),
            Self::Num => "Double".into(),
            Self::Null | Self::Json => "JSONValue".into(),
            Self::List(t) => format!("[{}]", t.swift()),
            Self::Map(t) => format!("[String: {}]", t.swift()),
            Self::Named(n) => (*n).into(),
        }
    }

    fn case(&self) -> String {
        match self {
            Self::Null => "null".into(),
            Self::Str => "string".into(),
            Self::Bool => "bool".into(),
            Self::Int(_) => "int".into(),
            Self::Num => "number".into(),
            Self::Json => "json".into(),
            Self::List(_) => "list".into(),
            Self::Map(_) => "map".into(),
            Self::Named(n) => camel(n, false),
        }
    }
}

fn ts_props(ps: &[Prop<'_>], tag: Option<String>) -> String {
    let fs = ps.iter().map(|p| {
        let (q, null) = if p.opt { ("?", " | null") } else { ("", "") };
        format!("{}{q}: {}{null}", p.name, p.ty.ts())
    });
    format!(
        "{{ {} }}",
        tag.into_iter().chain(fs).collect::<Vec<String>>().join("; ")
    )
}

fn ts(s: &Value) -> Out {
    let mut out = format!("export const schemaVersion = {SCHEMA_VERSION};\n") + &ts_defs(s)?;
    let kinds = Block::KINDS
        .iter()
        .map(|k| format!("\"{k}\""))
        .collect::<Vec<_>>()
        .join(" | ");
    out.push_str(&format!("\nexport type Kind = {kinds};\n"));
    Ok(out)
}

fn ts_defs(s: &Value) -> Out {
    let mut out = String::new();
    for (name, d) in defs(s)? {
        let body = match &d {
            Def::Struct(ps) => ts_props(ps, None),
            Def::Words(ws) => ws.iter().map(|w| format!("\"{w}\"")).collect::<Vec<_>>().join(" | "),
            Def::Union(ts) => ts.iter().map(Ty::ts).collect::<Vec<_>>().join(" | "),
            Def::Keyed(cases, rest) => {
                let cases = cases.iter().map(|(k, t)| format!("{{ {k}: {} }}", t.ts()));
                cases.chain(rest.map(String::from)).collect::<Vec<_>>().join(" | ")
            }
            Def::Tagged { tag, cases, rest } => {
                let case = |(c, p): &(&str, Case<'_>)| match p {
                    Case::Ref(n) => format!("({{ {tag}: \"{c}\" }} & {n})"),
                    Case::Props(ps) => ts_props(ps, Some(format!("{tag}: \"{c}\""))),
                };
                let rest = rest.map(|r| format!("({r} & {{ [key: string]: unknown }})"));
                cases.iter().map(case).chain(rest).collect::<Vec<_>>().join(" | ")
            }
        };
        out.push_str(&format!("\nexport type {name} = {body};\n"));
    }
    Ok(out)
}

const SWIFT_WORDS: &[&str] = &[
    "any",
    "as",
    "break",
    "case",
    "catch",
    "class",
    "continue",
    "default",
    "defer",
    "do",
    "else",
    "enum",
    "extension",
    "false",
    "for",
    "func",
    "guard",
    "if",
    "import",
    "in",
    "init",
    "internal",
    "is",
    "let",
    "nil",
    "operator",
    "private",
    "protocol",
    "public",
    "repeat",
    "return",
    "self",
    "static",
    "struct",
    "subscript",
    "switch",
    "throw",
    "true",
    "try",
    "typealias",
    "var",
    "where",
    "while",
];

fn word(name: &str) -> String {
    if SWIFT_WORDS.contains(&name) {
        format!("`{name}`")
    } else {
        name.into()
    }
}

const CODABLE: &str = "Codable, Equatable, Sendable";

fn swift_struct(name: &str, ps: &[Prop<'_>]) -> String {
    let fs = ps.iter().map(|p| {
        let q = if p.opt { "?" } else { "" };
        format!("    public var {}: {}{q}\n", word(p.name), p.ty.swift())
    });
    format!("\npublic struct {name}: {CODABLE} {{\n{}}}\n", fs.collect::<String>())
}

fn swift_words(name: &str, ws: &[&str]) -> String {
    let lets = ws.iter().map(|w| {
        format!(
            "    public static let {} = Self(rawValue: \"{w}\")\n",
            word(&camel(w, false))
        )
    });
    let all = ws
        .iter()
        .map(|w| format!(".{}", word(&camel(w, false))))
        .collect::<Vec<_>>()
        .join(", ");
    format!(
        "\npublic struct {name}: RawRepresentable, Hashable, {CODABLE} {{\n    public let rawValue: String\n    \
         public init(rawValue: String) {{ self.rawValue = rawValue }}\n{}    public static let all: [Self] = [{all}]\n}}\n",
        lets.collect::<String>()
    )
}

fn swift_union(name: &str, ts: &[Ty<'_>]) -> String {
    let cases: String = ts
        .iter()
        .map(|t| match t {
            Ty::Null => "    case null\n".into(),
            _ => format!("    case {}({})\n", word(&t.case()), t.swift()),
        })
        .collect();
    let tries: Vec<String> = ts
        .iter()
        .map(|t| match t {
            Ty::Null => "if (try? decoder.singleValueContainer().decodeNil()) == true { self = .null }".into(),
            _ => format!(
                "if let v = try? {}(from: decoder) {{ self = .{}(v) }}",
                t.swift(),
                word(&t.case())
            ),
        })
        .collect();
    let encodes: String = ts
        .iter()
        .map(|t| match t {
            Ty::Null => "        case .null: var c = encoder.singleValueContainer(); try c.encodeNil()\n".into(),
            _ => format!("        case .{}(let v): try v.encode(to: encoder)\n", word(&t.case())),
        })
        .collect();
    format!(
        "\npublic enum {name}: {CODABLE} {{\n{cases}\n    public init(from decoder: any Decoder) throws {{\n        {} \
         else {{ throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: \"no {name}\")) }}\n    }}\n\n    \
         public func encode(to encoder: any Encoder) throws {{\n        switch self {{\n{encodes}        }}\n    }}\n}}\n",
        tries.join(" else ")
    )
}

fn swift_tagged(name: &str, tag: &str, cases: &[(&str, Case<'_>)], rest: Option<&str>) -> String {
    let mut out = String::new();
    let payload = |c: &str, p: &Case<'_>| match p {
        Case::Ref(n) => (*n).to_string(),
        Case::Props(_) => format!("{name}{}", camel(c, true)),
    };
    for (c, p) in cases {
        if let Case::Props(ps) = p {
            out.push_str(&swift_struct(&payload(c, p), ps));
        }
    }
    let other = rest.map_or("unknown".into(), |r| camel(r, false));
    let mut decl = String::new();
    let (mut dec, mut enc) = (String::new(), String::new());
    for (c, p) in cases {
        let (case, ty) = (word(&camel(c, false)), payload(c, p));
        decl.push_str(&format!("    case {case}({ty})\n"));
        dec.push_str(&format!(
            "        case \"{c}\": self = .{case}(try {ty}(from: decoder))\n"
        ));
        enc.push_str(&format!(
            "        case .{case}(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); \
             try c.encode(\"{c}\", forKey: .tag)\n"
        ));
    }
    let (rest_decl, rest_dec, rest_enc) = if rest.is_some() {
        (
            format!("    case {other}(JSONValue)\n"),
            format!("self = .{other}(try JSONValue(from: decoder))"),
            format!("        case .{other}(let v): try v.encode(to: encoder)\n"),
        )
    } else {
        (
            "    case unknown\n".into(),
            "self = .unknown".into(),
            "        case .unknown: var c = encoder.container(keyedBy: Tag.self); try c.encode(\"unknown\", forKey: .tag)\n".into(),
        )
    };
    out.push_str(&format!(
        "\npublic enum {name}: {CODABLE} {{\n{decl}{rest_decl}\n    private enum Tag: String, CodingKey {{ case tag = \"{tag}\" }}\n\n    \
         public init(from decoder: any Decoder) throws {{\n        \
         switch try decoder.container(keyedBy: Tag.self).decode(String.self, forKey: .tag) {{\n{dec}        \
         default: {rest_dec}\n        }}\n    }}\n\n    public func encode(to encoder: any Encoder) throws {{\n        \
         switch self {{\n{enc}{rest_enc}        }}\n    }}\n}}\n"
    ));
    out
}

fn swift_keyed(name: &str, cases: &[(&str, Ty<'_>)], rest: Option<&str>) -> String {
    let (mut decl, mut dec, mut enc) = (String::new(), String::new(), String::new());
    for (k, t) in cases {
        let case = word(k);
        decl.push_str(&format!("    case {case}({})\n", t.swift()));
        dec.push_str(&format!(
            "            case \"{k}\": self = .{case}(try c.decode({}.self, forKey: k)); return\n",
            t.swift()
        ));
        enc.push_str(&format!(
            "        case .{case}(let v): var c = encoder.container(keyedBy: Key.self); try c.encode(v, forKey: Key(\"{k}\"))\n"
        ));
    }
    let (rest_decl, rest_dec, rest_enc) = match rest {
        Some(r) => (
            format!("    case {}({r})\n", word(&camel(r, false))),
            format!("self = .{}(try {r}(from: decoder))", word(&camel(r, false))),
            format!(
                "        case .{}(let v): try v.encode(to: encoder)\n",
                word(&camel(r, false))
            ),
        ),
        None => (
            String::new(),
            "self = .unknown(try JSONValue(from: decoder))".into(),
            String::new(),
        ),
    };
    format!(
        "\npublic indirect enum {name}: {CODABLE} {{\n{decl}{rest_decl}    case unknown(JSONValue)\n\n    \
         private struct Key: CodingKey {{\n        let stringValue: String\n        var intValue: Int? {{ nil }}\n        \
         init(_ s: String) {{ stringValue = s }}\n        init?(stringValue: String) {{ self.init(stringValue) }}\n        \
         init?(intValue: Int) {{ nil }}\n    }}\n\n    public init(from decoder: any Decoder) throws {{\n        \
         if let c = try? decoder.container(keyedBy: Key.self), c.allKeys.count == 1, let k = c.allKeys.first {{\n            \
         switch k.stringValue {{\n{dec}            default: self = .unknown(try JSONValue(from: decoder)); return\n            }}\n        \
         }}\n        {rest_dec}\n    }}\n\n    public func encode(to encoder: any Encoder) throws {{\n        switch self {{\n\
         {enc}{rest_enc}        case .unknown(let v): try v.encode(to: encoder)\n        }}\n    }}\n}}\n"
    )
}

fn swift(s: &Value) -> Out {
    Ok(format!(
        "public let blocksSchemaVersion = {SCHEMA_VERSION}\n{}",
        swift_defs(s)?
    ))
}

fn swift_defs(s: &Value) -> Out {
    let mut out = String::new();
    for (name, d) in defs(s)? {
        out.push_str(&match &d {
            Def::Struct(ps) => swift_struct(name, ps),
            Def::Words(ws) => swift_words(name, ws),
            Def::Union(ts) => swift_union(name, ts),
            Def::Keyed(cases, rest) => swift_keyed(name, cases, *rest),
            Def::Tagged { tag, cases, rest } => swift_tagged(name, tag, cases, *rest),
        });
    }
    Ok(out)
}
