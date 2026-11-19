mod files;

use std::collections::BTreeMap;
use std::io::Write as _;
use std::process::ExitCode;

use blocks::guard::{self, Baseline, Finding, Held, Outcome, Scope, Severity};

const USAGE: &str = "usage: blocks check [--base <ref>] [--all] [--tighten] [--format text|json|sarif] [--out <file>]";

#[derive(Default)]
enum Format {
    #[default]
    Text,
    Json,
    Sarif,
}

#[derive(Default)]
struct Flags {
    base: Option<String>,
    all: bool,
    tighten: bool,
    format: Format,
    out: Option<String>,
}

/// `blocks check`: lint the screens `.blocks/guard.json` names and judge them; exit 0 clean, 1 a new error, 2 a broken setup.
pub fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();
    match run(&args) {
        Ok(true) => ExitCode::SUCCESS,
        Ok(false) => ExitCode::from(1),
        Err(e) => {
            if writeln!(std::io::stderr(), "blocks: {e}").is_err() {
                return ExitCode::from(3);
            }
            ExitCode::from(2)
        }
    }
}

fn value(it: &mut std::slice::Iter<String>, flag: &str) -> Result<String, String> {
    it.next().cloned().ok_or_else(|| format!("{flag} needs a value"))
}

fn flags(args: &[String]) -> Result<Flags, String> {
    let mut it = args.iter();
    if it.next().map(String::as_str) != Some("check") {
        return Err(USAGE.into());
    }
    let mut f = Flags::default();
    while let Some(a) = it.next() {
        match a.as_str() {
            "--base" => f.base = Some(value(&mut it, a)?),
            "--all" => f.all = true,
            "--tighten" => f.tighten = true,
            "--out" => f.out = Some(value(&mut it, a)?),
            "--format" => {
                f.format = match value(&mut it, a)?.as_str() {
                    "text" => Format::Text,
                    "json" => Format::Json,
                    "sarif" => Format::Sarif,
                    other => return Err(format!("--format {other}: not text, json or sarif")),
                }
            }
            other => return Err(format!("{other}: unknown flag; {USAGE}")),
        }
    }
    Ok(f)
}

fn run(args: &[String]) -> Result<bool, String> {
    let f = flags(args)?;
    let config = files::config()?;
    let mut scope = Scope::default();
    let mut screens = files::screens(&config, &mut scope.skipped)?;
    let base = f.base.as_deref().map(files::merge_base).transpose()?;
    if let (Some(mb), false, false) = (&base, f.all, f.tighten) {
        let changed = files::changed(mb)?;
        screens.retain(|name, fx| {
            [fx.path.clone(), files::baseline_path(name), files::ignore_path(name)]
                .iter()
                .any(|p| changed.contains(p))
        });
    }
    let mut held = Held::default();
    for (name, fx) in &screens {
        scope.fixtures.insert(name.clone(), fx.path.clone());
        held.ignores.insert(name.clone(), files::ignores(name)?);
        held.baselines.extend(files::baseline(name)?.map(|b| (name.clone(), b)));
    }
    if let Some(mb) = &base {
        if files::at_base::<serde_json::Value>(mb, files::CONFIG)?.is_some() {
            let mut was = BTreeMap::new();
            for name in screens.keys() {
                was.extend(files::at_base(mb, &files::baseline_path(name))?.map(|b| (name.clone(), b)));
            }
            held.base = Some(was);
        }
    }
    let kinds: Vec<&str> = config.kinds.iter().map(String::as_str).collect();
    let mut found = vec![];
    for fx in screens.values() {
        for seen in guard::lint(&fx.screen, &kinds) {
            let rule = seen.rule.clone();
            found.push(guard::finding(seen, &fx.path).ok_or_else(|| format!("{}: no rule {rule}", fx.path))?);
        }
    }
    let mut outcome = guard::judge(&found, &held, &scope);
    if f.tighten {
        held.baselines = tighten(&outcome, &held.baselines, &scope)?;
        outcome = guard::judge(&found, &held, &scope);
    }
    let body = match f.format {
        Format::Text => text(&outcome),
        Format::Json => json(&outcome)?,
        Format::Sarif => json(&guard::sarif(&outcome))?,
    };
    match &f.out {
        Some(path) => std::fs::write(path, body).map_err(|e| format!("{path}: {e}"))?,
        None => std::io::stdout()
            .write_all(body.as_bytes())
            .map_err(|e| format!("stdout: {e}"))?,
    }
    Ok(outcome.pass)
}

fn tighten(
    outcome: &Outcome,
    old: &BTreeMap<String, Baseline>,
    scope: &Scope,
) -> Result<BTreeMap<String, Baseline>, String> {
    let mut out = BTreeMap::new();
    for (name, path) in &scope.fixtures {
        let mine: Vec<Finding> = outcome
            .new
            .iter()
            .chain(&outcome.known)
            .filter(|f| f.file == *path)
            .cloned()
            .collect();
        let b = guard::tighten(old.get(name), &mine);
        let file = files::baseline_path(name);
        if b.known.is_empty() {
            match std::fs::remove_file(&file) {
                Err(e) if e.kind() != std::io::ErrorKind::NotFound => return Err(format!("{file}: {e}")),
                _ => continue,
            }
        }
        std::fs::create_dir_all(".blocks/baseline").map_err(|e| format!(".blocks/baseline: {e}"))?;
        std::fs::write(&file, json(&b)?).map_err(|e| format!("{file}: {e}"))?;
        out.insert(name.clone(), b);
    }
    Ok(out)
}

fn json<T: serde::Serialize>(v: &T) -> Result<String, String> {
    serde_json::to_string_pretty(v)
        .map(|s| s + "\n")
        .map_err(|e| e.to_string())
}

fn text(o: &Outcome) -> String {
    let mut shown: Vec<&Finding> = o.new.iter().chain(&o.warned).collect();
    shown.sort_by(|a, b| a.file.cmp(&b.file));
    let mut s = String::new();
    let mut file = "";
    for f in shown {
        if f.file != file {
            file = &f.file;
            s.push_str(&format!("{file}\n"));
        }
        let sev = if f.severity == Severity::Error { "error" } else { "warn" };
        s.push_str(&format!("  {sev:<5}  {:<24} {}\n", f.rule, f.at));
        s.push_str(&format!("         {}\n         fix: {}\n", f.message, f.fix));
    }
    let verdict = if o.pass { "PASS" } else { "FAIL" };
    s.push_str(&format!(
        "{} screens checked: {} new errors, {} known, {} ignored, {} warnings. {verdict}\n",
        o.checked.len(),
        o.new.len(),
        o.known.len(),
        o.ignored.len(),
        o.warned.len()
    ));
    s
}
