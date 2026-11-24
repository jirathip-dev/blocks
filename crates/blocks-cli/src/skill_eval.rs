use std::collections::BTreeSet;
use std::path::Path;

use blocks::guard::{self, Severity};
use blocks::{tree, Block, Built};
use serde::Deserialize;
use serde_json::Value;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Evals {
    cases: Vec<Case>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Case {
    id: String,
    prompt: String,
    #[serde(default)]
    kinds: Vec<String>,
    #[serde(default)]
    absent: Vec<String>,
    #[serde(default)]
    avoid: Vec<String>,
    #[serde(default)]
    actions: Vec<String>,
}

fn cases(dir: &str) -> Result<Vec<Case>, String> {
    let path = Path::new(dir).join("evals.json");
    let text = std::fs::read_to_string(&path).map_err(|e| format!("{}: {e}", path.display()))?;
    let evals: Evals = serde_json::from_str(&text).map_err(|e| format!("{}: {e}", path.display()))?;
    let mut ids = BTreeSet::new();
    for c in &evals.cases {
        let bad = |why: String| format!("{}: case `{}`: {why}", path.display(), c.id);
        if !ids.insert(c.id.as_str()) || c.id.is_empty() {
            return Err(bad("an empty or repeated id".into()));
        }
        if c.prompt.trim().is_empty() {
            return Err(bad("no prompt".into()));
        }
        if let Some(k) = c
            .kinds
            .iter()
            .chain(&c.absent)
            .find(|k| !Block::KINDS.contains(&k.as_str()))
        {
            return Err(bad(format!("`{k}` is no kind")));
        }
        if let Some(r) = c.avoid.iter().find(|r| guard::rule(r).is_none()) {
            return Err(bad(format!("`{r}` is no rule")));
        }
    }
    Ok(evals.cases)
}

fn kinds(n: &tree::Node, out: &mut BTreeSet<String>) {
    out.insert(n.kind.clone());
    n.children.iter().for_each(|c| kinds(c, out));
}

fn sent(v: &Value, out: &mut BTreeSet<String>) {
    match v {
        Value::Object(o) => {
            out.extend(o.get("action").and_then(Value::as_str).map(String::from));
            o.values().for_each(|x| sent(x, out));
        }
        Value::Array(l) => l.iter().for_each(|x| sent(x, out)),
        _ => {}
    }
}

fn misses(case: &Case, reply: &Value) -> Vec<String> {
    let screen = Built::new(reply.clone());
    let mut out = vec![];
    for s in guard::lint(&screen, &[]) {
        let error = guard::rule(&s.rule).is_some_and(|r| r.severity == Severity::Error);
        if error || case.avoid.contains(&s.rule) {
            out.push(format!("{} at {}", s.rule, s.at));
        }
    }
    let mut drawn = BTreeSet::new();
    kinds(&tree::expect(&screen, Block::KINDS, &Default::default()), &mut drawn);
    out.extend(
        case.kinds
            .iter()
            .filter(|k| !drawn.contains(*k))
            .map(|k| format!("no `{k}`")),
    );
    out.extend(
        case.absent
            .iter()
            .filter(|k| drawn.contains(*k))
            .map(|k| format!("a `{k}`")),
    );
    let mut actions = BTreeSet::new();
    sent(reply, &mut actions);
    out.extend(
        case.actions
            .iter()
            .filter(|a| !actions.contains(*a))
            .map(|a| format!("no action `{a}`")),
    );
    out
}

pub(crate) fn run(args: &[String]) -> Result<bool, String> {
    let [dir, flag, replies] = args else {
        return Err(crate::USAGE.into());
    };
    if flag != "--replies" {
        return Err(format!("{flag}: unknown flag; {}", crate::USAGE));
    }
    let mut report = String::new();
    let mut failed = 0;
    let all = cases(dir)?;
    for case in &all {
        let path = Path::new(replies).join(format!("{}.json", case.id));
        let reply = std::fs::read_to_string(&path)
            .map_err(|e| e.to_string())
            .and_then(|t| serde_json::from_str::<Value>(&t).map_err(|e| e.to_string()));
        let miss = match reply {
            Ok(v) => misses(case, &v),
            Err(e) => vec![format!("{}: {e}", path.display())],
        };
        if miss.is_empty() {
            report.push_str(&format!("ok {}\n", case.id));
        } else {
            failed += 1;
            report.push_str(&format!("FAIL {}: {}\n", case.id, miss.join("; ")));
        }
    }
    report.push_str(&format!("{} cases, {failed} failed\n", all.len()));
    crate::write(None, &report)?;
    Ok(failed == 0)
}
