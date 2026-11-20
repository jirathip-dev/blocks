mod draw;
mod explore;
mod files;
mod new;
mod skill;

mod gen {
    pub(crate) mod skill;
}

use std::collections::BTreeMap;
use std::io::Write as _;
use std::process::ExitCode;

use blocks::guard::{self, Baseline, Finding, Held, Outcome, Scope, Severity};

const USAGE: &str = "usage: blocks check [--base <ref>] [--all] [--render] [--explore [--seed <n>] [--minutes <n>]] [--tighten] [--format text|json|sarif] [--out <file>] | blocks check --replay <steps.json> [--render] | blocks check --shot <fixture>… | blocks skill --to <dir> | blocks new kind <name>";

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
    render: bool,
    explore: bool,
    seed: u64,
    minutes: Option<u64>,
    replay: Option<String>,
    shot: Vec<String>,
    tighten: bool,
    format: Format,
    out: Option<String>,
}

/// `blocks check` lints, draws with `--render` and judges the screens `.blocks/guard.json` names; `blocks skill` writes the usage skill; `blocks new kind` writes a kind's five files; exit 0 ok, 1 a finding, 2 a broken setup.
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

fn number(it: &mut std::slice::Iter<String>, flag: &str) -> Result<u64, String> {
    let v = value(it, flag)?;
    v.parse().map_err(|_| format!("{flag} {v}: not a whole number"))
}

fn flags(args: &[String]) -> Result<Flags, String> {
    let mut it = args.iter();
    let mut f = Flags::default();
    while let Some(a) = it.next() {
        match a.as_str() {
            "--base" => f.base = Some(value(&mut it, a)?),
            "--all" => f.all = true,
            "--render" => f.render = true,
            "--explore" => f.explore = true,
            "--seed" => f.seed = number(&mut it, a)?,
            "--minutes" => f.minutes = Some(number(&mut it, a)?),
            "--replay" => f.replay = Some(value(&mut it, a)?),
            "--shot" => f.shot.push(value(&mut it, a)?),
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
    match args.split_first() {
        Some((cmd, rest)) if cmd == "check" => check(rest),
        Some((cmd, rest)) if cmd == "skill" => skill::run(rest),
        Some((cmd, rest)) if cmd == "new" => new::run(rest),
        _ => Err(USAGE.into()),
    }
}

fn check(args: &[String]) -> Result<bool, String> {
    let f = flags(args)?;
    let config = files::config()?;
    let mut scope = Scope {
        rendered: f.render,
        ..Scope::default()
    };
    let mut screens = files::screens(&config, &mut scope.skipped)?;
    if !f.shot.is_empty() {
        return write(f.out.as_ref(), &draw::shots(&config, &screens, &f.shot)?).map(|()| true);
    }
    if let Some(file) = &f.replay {
        let (name, found) = explore::replay(&config, &screens, file, f.render)?;
        scope
            .fixtures
            .extend(screens.get(&name).map(|fx| (name, fx.path.clone())));
        return report(&f, &guard::judge(&found, &Held::default(), &scope));
    }
    let names: Vec<String> = screens.keys().cloned().collect();
    let base = f.base.as_deref().map(files::merge_base).transpose()?;
    if let (Some(mb), false, false) = (&base, f.all, f.tighten) {
        let changed = files::changed(mb)?;
        let looks = config.css.iter().chain(&config.scripts).chain(&config.inputs);
        let redraw = f.render
            && looks.map(|p| p.trim_end_matches('/')).any(|p| {
                changed
                    .iter()
                    .any(|c| c == p || c.strip_prefix(p).is_some_and(|r| r.starts_with('/')))
            });
        screens.retain(|name, fx| {
            redraw
                || [fx.path.clone(), files::baseline_path(name), files::ignore_path(name)]
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
            for name in names {
                was.extend(files::at_base(mb, &files::baseline_path(&name))?.map(|b| (name, b)));
            }
            for (name, fx) in &screens {
                if files::at_base::<serde_json::Value>(mb, &fx.path)?.is_some() {
                    held.on_base.insert(name.clone());
                }
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
    if f.render {
        found.extend(draw::render(&config, &screens)?);
    }
    if f.explore {
        let how = (f.seed, f.minutes, f.render);
        explore::run(&config, &screens, how, &mut found, &mut scope.skipped)?;
    }
    let mut outcome = guard::judge(&found, &held, &scope);
    if f.tighten {
        held.baselines = tighten(&outcome, &held.baselines, &scope)?;
        outcome = guard::judge(&found, &held, &scope);
    }
    report(&f, &outcome)
}

fn report(f: &Flags, outcome: &Outcome) -> Result<bool, String> {
    let body = match f.format {
        Format::Text => text(outcome),
        Format::Json => json(outcome)?,
        Format::Sarif => json(&guard::sarif(outcome))?,
    };
    write(f.out.as_ref(), &body).map(|()| outcome.pass)
}

fn write(out: Option<&String>, body: &str) -> Result<(), String> {
    match out {
        Some(path) => std::fs::write(path, body).map_err(|e| format!("{path}: {e}")),
        None => std::io::stdout()
            .write_all(body.as_bytes())
            .map_err(|e| format!("stdout: {e}")),
    }
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
        let b = guard::tighten(old.get(name), &mine, scope.rendered);
        let file = files::baseline_path(name);
        if b.known.is_empty() {
            files::remove(&file)?;
            continue;
        }
        std::fs::create_dir_all(".blocks/baseline").map_err(|e| format!(".blocks/baseline: {e}"))?;
        std::fs::write(&file, json(&b)?).map_err(|e| format!("{file}: {e}"))?;
        out.insert(name.clone(), b);
    }
    Ok(out)
}

pub(crate) fn json<T: serde::Serialize>(v: &T) -> Result<String, String> {
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
        if let Some(steps) = &f.steps {
            s.push_str(&format!("         replay: blocks check --replay {steps}\n"));
        }
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
