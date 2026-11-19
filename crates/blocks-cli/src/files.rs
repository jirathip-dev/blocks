use std::collections::{BTreeMap, BTreeSet};
use std::process::Command;

use blocks::guard::{Baseline, Config, Ignore};
use blocks::Built;
use serde::de::DeserializeOwned;
use serde_json::Value;

pub(crate) const CONFIG: &str = ".blocks/guard.json";

pub(crate) struct Fixture {
    pub(crate) path: String,
    pub(crate) screen: Built,
}

pub(crate) fn baseline_path(name: &str) -> String {
    format!(".blocks/baseline/{name}.json")
}

pub(crate) fn ignore_path(name: &str) -> String {
    format!(".blocks/ignore/{name}.json")
}

fn parse<T: DeserializeOwned>(path: &str, text: &str) -> Result<T, String> {
    serde_json::from_str(text).map_err(|e| format!("{path}: {e}"))
}

pub(crate) fn read<T: DeserializeOwned>(path: &str) -> Result<Option<T>, String> {
    match std::fs::read_to_string(path) {
        Ok(text) => parse(path, &text).map(Some),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(format!("{path}: {e}")),
    }
}

pub(crate) fn config() -> Result<Config, String> {
    read(CONFIG)?.ok_or_else(|| format!("{CONFIG}: not found"))
}

pub(crate) fn screens(config: &Config, skipped: &mut Vec<String>) -> Result<BTreeMap<String, Fixture>, String> {
    let mut out = BTreeMap::new();
    for dir in &config.screens {
        let dir = dir.trim_end_matches('/');
        let mut names: Vec<String> = std::fs::read_dir(dir)
            .map_err(|e| format!("{dir}: {e}"))?
            .filter_map(Result::ok)
            .filter_map(|e| Some(e.file_name().into_string().ok()?.strip_suffix(".json")?.to_string()))
            .collect();
        names.sort();
        for name in names {
            let path = format!("{dir}/{name}.json");
            let value: Value = read(&path)?.unwrap_or_default();
            if !matches!(value.get("type").and_then(Value::as_str), Some("screen" | "sheet")) {
                skipped.push(format!("{path}: not a screen"));
                continue;
            }
            let screen = Built::new(value);
            if let Some(was) = out.insert(
                name.clone(),
                Fixture {
                    path: path.clone(),
                    screen,
                },
            ) {
                return Err(format!("{path}: the fixture name `{name}` is also {}", was.path));
            }
        }
    }
    Ok(out)
}

pub(crate) fn ignores(name: &str) -> Result<Vec<Ignore>, String> {
    Ok(read(&ignore_path(name))?.unwrap_or_default())
}

pub(crate) fn baseline(name: &str) -> Result<Option<Baseline>, String> {
    read(&baseline_path(name))
}

fn git(args: &[&str]) -> Result<Option<String>, String> {
    let out = Command::new("git")
        .args(args)
        .output()
        .map_err(|e| format!("git: {e}"))?;
    Ok(out
        .status
        .success()
        .then(|| String::from_utf8_lossy(&out.stdout).into_owned()))
}

pub(crate) fn merge_base(base: &str) -> Result<String, String> {
    let mb = git(&["merge-base", base, "HEAD"])?.ok_or_else(|| format!("--base {base}: no merge base with HEAD"))?;
    Ok(mb.trim().to_string())
}

pub(crate) fn changed(mb: &str) -> Result<BTreeSet<String>, String> {
    let diff = git(&["diff", "--name-only", "--relative", mb])?.ok_or("git diff failed")?;
    let new = git(&["ls-files", "--others", "--exclude-standard"])?.ok_or("git ls-files failed")?;
    Ok(diff.lines().chain(new.lines()).map(String::from).collect())
}

pub(crate) fn at_base<T: DeserializeOwned>(mb: &str, path: &str) -> Result<Option<T>, String> {
    match git(&["show", &format!("{mb}:./{path}")])? {
        Some(text) => parse(&format!("{mb}:{path}"), &text).map(Some),
        None => Ok(None),
    }
}
