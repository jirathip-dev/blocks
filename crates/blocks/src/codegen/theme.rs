use std::path::Path;

use serde_json::Value;

use super::Files;
use crate::theme;

pub(super) fn files(_: &Path, _: &Value) -> std::io::Result<Files> {
    Ok(vec![
        ("web/src/gen/schemes.ts".into(), schemes_ts()?),
        ("swift/Sources/Blocks/Gen/Schemes.swift".into(), schemes_swift()?),
    ])
}

fn schemes_ts() -> serde_json::Result<String> {
    let tokens = theme::default()
        .light
        .tokens
        .all()
        .map(|(k, _)| format!("\"{k}\""))
        .join(" | ");
    Ok(format!(
        "export type Mode = \"dark\" | \"light\";\n\nexport type Token = {tokens};\n\n\
         export type Scheme = {{ label: string; \"color-scheme\": Mode; tokens: Record<Token, string> }};\n\n\
         export const defaultPair: Record<Mode, Scheme> = {};\n\n\
         export const defaultStyle: Record<string, string> = {};\n\n\
         export const rules = {{\n  type: {},\n{}}};\n\n\
         export const curves = {};\n\n\
         export const cases = {};\n\n\
         export const drawn = {};\n\n\
         type Label = {{ prefix?: string; suffix?: string; case?: keyof typeof cases }};\n\n\
         export type Axes = {{ [K in keyof typeof rules]?: keyof (typeof rules)[K] }};\n\n\
         export type Scale = Axes & {{ space?: number; motion?: number; radius?: number; easing?: keyof typeof curves; labels?: Record<string, Label> }};\n",
        serde_json::to_string_pretty(theme::default())?,
        serde_json::to_string_pretty(&std::collections::BTreeMap::from(theme::DEFAULT_STYLE))?,
        table(theme::TypeDesign::ALL.iter().map(|v| (v, v.css())))?,
        theme::AXES
            .iter()
            .map(|a| Ok(format!("  {}: {},\n", a.name, table(a.values.iter().map(|(v, rows)| (v, rows.iter().map(|r| r.css()).collect::<String>())))?)))
            .collect::<serde_json::Result<String>>()?,
        table(theme::Easing::ALL.iter().map(|v| (v, v.curve())))?,
        table(theme::LabelCase::ALL.iter().map(|v| (v, v.css())))?,
        table(theme::LabelRole::ALL.iter().filter_map(|r| Some((r, theme::Finish::Label(*r).selector()?))))?,
    ))
}

fn table<K: serde::Serialize, V: serde::Serialize>(rows: impl Iterator<Item = (K, V)>) -> serde_json::Result<String> {
    let rows = rows
        .map(|(k, v)| {
            Ok(format!(
                "{}: {}",
                serde_json::to_string(&k)?,
                serde_json::to_string(&v)?
            ))
        })
        .collect::<serde_json::Result<Vec<_>>>()?;
    Ok(format!("{{ {} }}", rows.join(", ")))
}

fn scheme_swift(s: &theme::Scheme) -> serde_json::Result<String> {
    let q = |s: &str| serde_json::to_string(s);
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
    Ok(format!(
        "Scheme(label: {}, mode: .{mode}, tokens: [{tokens}])",
        q(&s.label)?
    ))
}

fn schemes_swift() -> serde_json::Result<String> {
    let q = |s: &str| serde_json::to_string(s);
    let mut out = String::from(
        "public enum SchemeMode: String, Codable, Equatable, Sendable {\n    case dark, light\n}\n\n\
         public struct Scheme: Equatable, Sendable {\n    public let label: String\n    public let mode: SchemeMode\n    \
         public let tokens: [String: String]\n\n    \
         public init(label: String, mode: SchemeMode, tokens: [String: String]) {\n        \
         self.label = label\n        self.mode = mode\n        self.tokens = tokens\n    }\n}\n\n",
    );
    let pair = theme::default();
    let style = theme::DEFAULT_STYLE
        .iter()
        .map(|(k, v)| Ok(format!("{}: {}", q(k)?, q(v)?)))
        .collect::<serde_json::Result<Vec<_>>>()?
        .join(", ");
    out.push_str(&format!(
        "public let blocksDefaultLight = {}\n\npublic let blocksDefaultDark = {}\n\n\
         public let blocksDefaultStyle: [String: String] = [{style}]\n",
        scheme_swift(&pair.light)?,
        scheme_swift(&pair.dark)?
    ));
    Ok(out)
}
