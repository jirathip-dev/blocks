use std::collections::{BTreeMap, BTreeSet};
use std::io::{BufRead as _, BufReader, Write as _};
use std::path::Path;
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::time::{Duration, Instant};

use blocks::guard::explore::{self, Reply, Walk};
use blocks::guard::{self, Config, Finding, Run, Seen};
use blocks::tree::{Shot, Step};
use blocks::{Action, Answer};
use serde::Deserialize as _;
use serde_json::Value;

use super::draw;
use crate::files::{self, Fixture};

const BUDGET: usize = 30;
const TRIES: usize = 40;
const OUT: &str = "shots/explore";

#[derive(serde::Serialize)]
struct First<'a> {
    screen: &'a str,
    seed: u64,
}

struct Answerer {
    child: Child,
    to: ChildStdin,
    from: BufReader<ChildStdout>,
}

impl Answerer {
    fn start(cmd: &[String], screen: &str, seed: u64) -> Result<Answerer, String> {
        let (bin, args) = cmd.split_first().ok_or("an empty `answer` command")?;
        let mut child = Command::new(bin)
            .args(args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .spawn()
            .map_err(|e| format!("{bin}: {e}"))?;
        let to = child.stdin.take().ok_or("the answerer has no stdin")?;
        let from = BufReader::new(child.stdout.take().ok_or("the answerer has no stdout")?);
        let mut a = Answerer { child, to, from };
        a.send(&First { screen, seed }).map_err(|e| format!("{bin}: {e}"))?;
        Ok(a)
    }

    fn send(&mut self, v: &impl serde::Serialize) -> Result<(), String> {
        let line = serde_json::to_string(v).map_err(|e| e.to_string())?;
        writeln!(self.to, "{line}").map_err(|e| e.to_string())
    }

    fn ask(&mut self, action: &Action) -> Reply {
        self.send(action).ok()?;
        let mut line = String::new();
        if self.from.read_line(&mut line).ok()? == 0 {
            return None;
        }
        let v: Value = match serde_json::from_str(&line) {
            Ok(v) => v,
            Err(e) => return Some(Err(format!("not JSON: {e}"))),
        };
        if let Some(why) = v.get("error") {
            return Some(Err(why.as_str().map_or_else(|| why.to_string(), String::from)));
        }
        Some(Answer::deserialize(&v).map_err(|e| format!("not an Answer: {e}")))
    }

    fn stop(mut self) -> Result<(), String> {
        drop(self.to);
        self.child.kill().map_err(|e| format!("the answerer: {e}"))?;
        self.child.wait().map(drop).map_err(|e| format!("the answerer: {e}"))
    }
}

fn walk(config: &Config, fx: &Fixture, kinds: &[&str], seed: u64) -> Result<Walk, String> {
    let Some(cmd) = &config.answer else {
        let nothing = &mut |_: &Action| Some(Ok(Answer::default()));
        return Ok(explore::walk(&fx.screen, kinds, seed, BUDGET, nothing));
    };
    let mut a = Answerer::start(cmd, &fx.path, seed)?;
    let w = explore::walk(&fx.screen, kinds, seed, BUDGET, &mut |act| a.ask(act));
    a.stop()?;
    Ok(w)
}

fn script(steps: &[Step]) -> Vec<Step> {
    let mut out = vec![];
    let mut n = 0;
    let shot = |n: usize| {
        Step::Shot(Shot {
            name: format!("step-{n}"),
        })
    };
    for s in steps {
        if matches!(s, Step::Tap(_) | Step::Type(_)) {
            if n > 0 {
                out.push(shot(n));
            }
            n += 1;
        }
        out.push(s.clone());
    }
    out.push(shot(n));
    out
}

fn save(file: &str, steps: &[Step]) -> Result<(), String> {
    if let Some(dir) = Path::new(file).parent() {
        std::fs::create_dir_all(dir).map_err(|e| format!("{}: {e}", dir.display()))?;
    }
    std::fs::write(file, crate::json(&steps)?).map_err(|e| format!("{file}: {e}"))
}

fn finding(seen: Seen, fx: &Fixture, file: &str) -> Result<Finding, String> {
    let rule = seen.rule.clone();
    let mut f = guard::finding(seen, &fx.path).ok_or_else(|| format!("{}: no rule {rule}", fx.path))?;
    f.steps = Some(file.into());
    Ok(f)
}

struct Drawn<'a> {
    run: String,
    fx: &'a Fixture,
    steps: Vec<Step>,
    sent: Vec<Action>,
    file: String,
}

fn harness(config: &Config, walks: &[Drawn], out: &str) -> Result<Vec<Finding>, String> {
    let runs: Vec<Run> = walks
        .iter()
        .map(|d| Run {
            name: d.run.clone(),
            screen: d.fx.path.clone(),
            size: draw::PHONE.into(),
            css: config.css.clone(),
            scripts: config.scripts.clone(),
            kinds: config.kinds.clone(),
            steps: d.steps.clone(),
            probes: true,
        })
        .collect();
    let mut seen: Vec<(String, Seen)> = vec![];
    for s in draw::draw(config, &runs, out)? {
        seen.push((s.run.clone().unwrap_or_default(), s));
    }
    for i in 0..config.harness.len() {
        let dir = if i == 0 { out.to_string() } else { format!("{out}.{i}") };
        for d in walks {
            let report = format!("{dir}/{}/report.json", d.run);
            let got: Value = files::read(&report)?.ok_or_else(|| format!("{report}: not written"))?;
            let names = got.get("sent").and_then(Value::as_array).into_iter().flatten();
            let names: Vec<String> = names.filter_map(|a| Some(a.get("action")?.as_str()?.into())).collect();
            seen.extend(explore::sent_differs(&d.sent, &names).map(|s| (d.run.clone(), s)));
        }
    }
    let mut found = vec![];
    for (run, s) in seen {
        let d = walks.iter().find(|d| d.run == run);
        let d = d.ok_or_else(|| format!("the harness saw {} in no run of the plan", s.rule))?;
        if !Path::new(&d.file).exists() {
            save(&d.file, &d.steps)?;
        }
        found.push(finding(s, d.fx, &d.file)?);
    }
    Ok(found)
}

pub(crate) fn run(
    config: &Config,
    screens: &BTreeMap<String, Fixture>,
    (run_seed, minutes, render): (u64, Option<u64>, bool),
    out: &mut Vec<Finding>,
    skipped: &mut Vec<String>,
) -> Result<(), String> {
    if config.answer.is_none() {
        skipped.push("explore/unanswered: no answerer".into());
    }
    let kinds: Vec<&str> = config.kinds.iter().map(String::as_str).collect();
    let until = minutes.map(|m| Instant::now() + Duration::from_secs(m.saturating_mul(60)));
    let (mut found, mut stuck) = (vec![], BTreeSet::new());
    for n in 0_u64.. {
        let mut drawn = vec![];
        for (name, fx) in screens {
            if stuck.contains(name) {
                continue;
            }
            let seed = explore::seed(run_seed, name, n);
            let w = walk(config, fx, &kinds, seed)?;
            if w.steps.is_empty() {
                stuck.insert(name.clone());
            }
            let file = format!("{OUT}/{name}/{n}.steps.json");
            if config.answer.is_some() && walk(config, fx, &kinds, seed)?.steps != w.steps {
                let unstable = Seen {
                    rule: "explore/unstable".into(),
                    detail: format!("seed {seed} walk {n}"),
                    ..Seen::default()
                };
                save(&file, &script(&w.steps))?;
                found.push(finding(unstable, fx, &file)?);
            }
            if let Some(first) = w.seen.first() {
                let same = |s: &Seen| s.rule == first.rule && s.at == first.at;
                let fails = &mut |s: &[Step]| explore::replay(&fx.screen, &kinds, s).seen.iter().any(same);
                let short = explore::shrink(&w.steps, fails, TRIES);
                save(&file, &script(&short))?;
                let mut s = first.clone();
                s.detail = format!(
                    "{} (seed {seed} walk {n}: {} steps, shrunk to {})",
                    s.detail,
                    w.steps.len(),
                    short.len()
                );
                found.push(finding(s, fx, &file)?);
            }
            let (steps, sent) = (script(&w.steps), w.sent);
            let (run, file) = (format!("{name}/{n}"), format!("{OUT}/{name}/{n}.drawn.steps.json"));
            drawn.push(Drawn {
                run,
                fx,
                steps,
                sent,
                file,
            });
        }
        if render && !drawn.is_empty() {
            found.extend(harness(config, &drawn, OUT)?);
        }
        if until.is_none_or(|u| Instant::now() >= u) || stuck.len() == screens.len() {
            break;
        }
    }
    let key = |f: &Finding| (f.rule.clone(), f.file.clone(), f.at.clone());
    let mut once: BTreeSet<_> = out.iter().map(key).collect();
    out.extend(found.into_iter().filter(|f| once.insert(key(f))));
    Ok(())
}

pub(crate) fn replay(
    config: &Config,
    screens: &BTreeMap<String, Fixture>,
    file: &str,
    render: bool,
) -> Result<(String, Vec<Finding>), String> {
    let name = Path::new(file)
        .parent()
        .and_then(Path::file_name)
        .and_then(|n| n.to_str());
    let name = name.ok_or_else(|| format!("--replay {file}: not under shots/explore/<fixture>/"))?;
    let fx = screens
        .get(name)
        .ok_or_else(|| format!("--replay {file}: no fixture {name}"))?;
    let steps: Vec<Step> = files::read(file)?.ok_or_else(|| format!("{file}: not found"))?;
    let kinds: Vec<&str> = config.kinds.iter().map(String::as_str).collect();
    let w = explore::replay(&fx.screen, &kinds, &steps);
    let mut found = vec![];
    for s in w.seen {
        found.push(finding(s, fx, file)?);
    }
    if render {
        let (run, file) = ("replay".to_string(), file.to_string());
        let d = Drawn {
            run,
            fx,
            steps,
            sent: w.sent,
            file,
        };
        found.extend(harness(config, &[d], "shots/replay")?);
    }
    Ok((name.into(), found))
}
