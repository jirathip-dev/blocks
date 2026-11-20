use std::path::Path;

use serde_json::Value;

use super::model::{camel, defs, Case, Def, Out, Prop, Ty};
use super::Files;
use crate::{layout, theme, SCHEMA_VERSION};

mod kinds;

pub(super) fn files(root: &Path, s: &Value) -> std::io::Result<Files> {
    let mut out = kinds::files(root)?;
    out.extend([
        (
            "swift/Sources/Blocks/Gen/Blocks.swift".into(),
            swift(s).map_err(std::io::Error::other)?,
        ),
        (
            "swift/Sources/Blocks/Gen/Style.swift".into(),
            style_swift().map_err(std::io::Error::other)?,
        ),
        (
            "swift/Sources/Blocks/Gen/LayoutShapes.swift".into(),
            layout_swift().map_err(std::io::Error::other)?,
        ),
    ]);
    Ok(out)
}

impl Ty<'_> {
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
        dec.push_str(&match rest {
            Some(_) => format!(
                "        case \"{c}\": self = try (try? {ty}(from: decoder)).map(Self.{case}) ?? .{other}(JSONValue(from: decoder))\n"
            ),
            None => format!("        case \"{c}\": self = .{case}(try {ty}(from: decoder))\n"),
        });
        enc.push_str(&format!(
            "        case .{case}(let v): try v.encode(to: encoder); var c = encoder.container(keyedBy: Tag.self); \
             try c.encode(\"{c}\", forKey: .tag)\n"
        ));
    }
    let (rest_decl, rest_dec, rest_enc) = if rest.is_some() {
        (
            format!(
                "    case {other}(JSONValue)\n\n    public static let tags: Set<String> = [{}]\n",
                cases
                    .iter()
                    .map(|(c, _)| format!("\"{c}\""))
                    .collect::<Vec<_>>()
                    .join(", ")
            ),
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
            "            case \"{k}\": if let v = try? c.decode({}.self, forKey: k) {{ self = .{case}(v); return }}\n",
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
         switch k.stringValue {{\n{dec}            default: break\n            }}\n            \
         self = .unknown(try JSONValue(from: decoder)); return\n        }}\n        {rest_dec}\n    }}\n\n    public func encode(to encoder: any Encoder) throws {{\n        switch self {{\n\
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

fn style_swift() -> Out {
    let style = swift_defs(&schemars::schema_for!(theme::Style).to_value())?;
    Ok(style + &swift_defs(&schemars::schema_for!(theme::LabelRole).to_value())?)
}

fn layout_swift() -> Out {
    let place = swift_defs(&schemars::schema_for!(layout::Edit).to_value())?;
    Ok(place + &swift_defs(&schemars::schema_for!(layout::Transition).to_value())?)
}
