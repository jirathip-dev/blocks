use std::collections::BTreeMap;
use std::io::Write as _;
use std::path::Path;
use std::process::{Command, Stdio};

use blocks::catalog::Catalog;
use blocks::model::{self, Case, Score};
use serde::Serialize;

struct Flags {
    dir: String,
    replies: String,
    model: Option<String>,
    system: Option<String>,
}

fn flags(args: &[String]) -> Result<Flags, String> {
    let mut it = args.iter();
    let dir = it.next().cloned().ok_or(crate::USAGE)?;
    let (mut replies, mut model, mut system) = (None, None, None);
    while let Some(a) = it.next() {
        let slot = match a.as_str() {
            "--replies" => &mut replies,
            "--model" => &mut model,
            "--system" => &mut system,
            other => return Err(format!("{other}: unknown flag; {}", crate::USAGE)),
        };
        *slot = Some(crate::value(&mut it, a)?);
    }
    if system.is_some() && model.is_none() {
        return Err("--system needs --model: recorded replies were written under their own prompt".into());
    }
    let replies = replies.ok_or("eval needs --replies <dir>")?;
    Ok(Flags {
        dir,
        replies,
        model,
        system,
    })
}

fn files(dir: &Path) -> Result<BTreeMap<String, String>, String> {
    let mut out = BTreeMap::new();
    let list = std::fs::read_dir(dir).map_err(|e| format!("{}: {e}", dir.display()))?;
    for entry in list {
        let path = entry.map_err(|e| e.to_string())?.path();
        if path.extension().is_some_and(|x| x == "json") {
            let name = path
                .file_stem()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_default();
            let text = std::fs::read_to_string(&path).map_err(|e| format!("{}: {e}", path.display()))?;
            out.insert(name, text);
        }
    }
    Ok(out)
}

#[derive(Serialize)]
struct Said<'a> {
    role: &'a str,
    text: &'a str,
}

#[derive(Serialize)]
struct Asked<'a> {
    system: &'a str,
    messages: Vec<Said<'a>>,
}

fn ask(cmd: &str, system: &str, messages: &[(&str, &str)]) -> Result<String, String> {
    let messages = messages.iter().map(|&(role, text)| Said { role, text }).collect();
    let input = serde_json::to_string(&Asked { system, messages }).map_err(|e| e.to_string())?;
    let mut child = Command::new("sh")
        .args(["-c", cmd])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .map_err(|e| format!("--model {cmd}: {e}"))?;
    child
        .stdin
        .take()
        .ok_or("--model: no stdin")?
        .write_all(input.as_bytes())
        .map_err(|e| format!("--model {cmd}: {e}"))?;
    let out = child.wait_with_output().map_err(|e| format!("--model {cmd}: {e}"))?;
    if !out.status.success() {
        return Err(format!("--model {cmd}: {}", out.status));
    }
    String::from_utf8(out.stdout).map_err(|e| format!("--model {cmd}: {e}"))
}

fn record(f: &Flags, cmd: &str, catalog: &Catalog, case: &Case, at: &str) -> Result<(), String> {
    let system = match &f.system {
        Some(file) => std::fs::read_to_string(file).map_err(|e| format!("{file}: {e}"))?,
        None => model::prompt(catalog),
    };
    let first = ask(cmd, &system, &[("user", &case.ask)])?;
    std::fs::write(format!("{at}.1.txt"), &first).map_err(|e| format!("{at}.1.txt: {e}"))?;
    match model::read(catalog, "eval", &first) {
        Ok(_) => crate::files::remove(&format!("{at}.2.txt")),
        Err(no) => {
            let messages = [("user", case.ask.as_str()), ("assistant", &first), ("user", &no.say())];
            let second = ask(cmd, &system, &messages)?;
            std::fs::write(format!("{at}.2.txt"), second).map_err(|e| format!("{at}.2.txt: {e}"))
        }
    }
}

fn share(k: usize, n: usize) -> usize {
    (200 * k + n) / (2 * n)
}

fn table(rows: &[(String, Score)]) -> String {
    let mut s = format!(
        "{:<20} {:>3} {:>5} {:>4} {:>5} {:>5} {:>5} {:>6}\n",
        "case", "fit", "retry", "fell", "mends", "warns", "meets", "chars"
    );
    for (name, r) in rows {
        let b = |x: bool| usize::from(x);
        s.push_str(&format!(
            "{name:<20} {:>3} {:>5} {:>4} {:>5} {:>5} {:>5} {:>6}\n",
            b(r.fit),
            b(r.retry),
            b(r.fell),
            r.mends,
            r.warns,
            b(r.meets),
            r.chars
        ));
    }
    let n = rows.len().max(1);
    let count = |p: fn(&Score) -> bool| rows.iter().filter(|(_, r)| p(r)).count();
    let mends: usize = rows.iter().map(|(_, r)| r.mends).sum();
    let chars: usize = rows.iter().map(|(_, r)| r.chars).sum();
    let tenths = (10 * mends + n / 2) / n;
    s.push_str(&format!(
        "{} cases: fit {}%, after one retry {}%, meets {}%, clean {}%, {}.{} mends, {} characters a reply\n",
        rows.len(),
        share(count(|r| r.fit), n),
        share(count(|r| !r.fell), n),
        share(count(|r| r.meets), n),
        share(count(|r| r.fit && r.mends == 0 && r.warns == 0), n),
        tenths / 10,
        tenths % 10,
        (chars + n / 2) / n
    ));
    s
}

pub(crate) fn run(args: &[String]) -> Result<bool, String> {
    let f = flags(args)?;
    let root = Path::new(&f.dir);
    let mut catalogs = BTreeMap::new();
    for (name, json) in files(&root.join("catalogs"))? {
        catalogs.insert(
            name.clone(),
            Catalog::read(&json).map_err(|e| format!("catalog {name}: {e}"))?,
        );
    }
    if f.model.is_some() {
        std::fs::create_dir_all(&f.replies).map_err(|e| format!("{}: {e}", f.replies))?;
    }
    let mut rows = vec![];
    for (name, json) in files(&root.join("cases"))? {
        let case: Case = serde_json::from_str(&json).map_err(|e| format!("case {name}: {e}"))?;
        let catalog = catalogs
            .get(&case.catalog)
            .ok_or_else(|| format!("case {name}: no catalog {}", case.catalog))?;
        let at = format!("{}/{name}", f.replies);
        if let Some(cmd) = &f.model {
            record(&f, cmd, catalog, &case, &at)?;
        }
        let Ok(first) = std::fs::read_to_string(format!("{at}.1.txt")) else {
            continue;
        };
        let second = std::fs::read_to_string(format!("{at}.2.txt")).ok();
        rows.push((name, model::score(catalog, &case.expect, &first, second.as_deref())));
    }
    crate::write(None, &table(&rows))?;
    Ok(true)
}
