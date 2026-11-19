use std::collections::BTreeSet;

use super::{finding, rule, Baseline, Finding, Held, Ignored, Known, Outcome, Scope, Seen, Severity, VERSION};

fn guard(id: &str, path: &str, at: &str, detail: &str) -> Option<Finding> {
    let seen = Seen {
        rule: id.into(),
        at: at.into(),
        detail: detail.into(),
        ..Seen::default()
    };
    finding(seen, path)
}

fn known(f: &Finding) -> Known {
    Known {
        rule: f.rule.clone(),
        at: f.at.clone(),
    }
}

/// The verdict on the fixtures in `scope`: each finding is ignored, known, warned or new, and a stale entry, an unused ignore or a grown baseline is new.
pub fn judge(found: &[Finding], held: &Held, scope: &Scope) -> Outcome {
    let mut out = Outcome {
        guard: VERSION,
        pass: true,
        new: vec![],
        warned: vec![],
        known: vec![],
        ignored: vec![],
        checked: scope.fixtures.values().cloned().collect(),
        skipped: scope.skipped.clone(),
    };
    for (name, path) in &scope.fixtures {
        let ignores = held.ignores.get(name).map_or(&[][..], Vec::as_slice);
        let entries = held.baselines.get(name).map_or(&[][..], |b| b.known.as_slice());
        let (mut used_ignores, mut used_entries) = (BTreeSet::new(), BTreeSet::new());
        for f in found.iter().filter(|f| f.file == *path) {
            let f = f.clone();
            if let Some((i, ig)) = ignores.iter().enumerate().find(|(_, ig)| ig.covers(&f)) {
                used_ignores.insert(i);
                let reason = ig.reason.clone().into();
                out.ignored.push(Ignored { finding: f, reason });
            } else if f.severity == Severity::Warn {
                out.warned.push(f);
            } else if let Some(i) = entries.iter().position(|k| *k == known(&f)) {
                used_entries.insert(i);
                out.known.push(f);
            } else {
                out.new.push(f);
            }
        }
        for (_, ig) in ignores.iter().enumerate().filter(|(i, _)| !used_ignores.contains(i)) {
            out.new.extend(guard("guard/unused-ignore", path, &ig.at, &ig.rule));
        }
        for (_, k) in entries.iter().enumerate().filter(|(i, _)| !used_entries.contains(i)) {
            out.new.extend(guard("guard/baseline-stale", path, &k.at, &k.rule));
        }
        if let Some(base) = &held.base {
            let was = base.get(name);
            let floor = was.map_or(u16::MAX, |b| b.guard);
            for k in entries {
                let kept = was.is_some_and(|b| b.known.contains(k));
                if !kept && rule(&k.rule).is_none_or(|r| r.since <= floor) {
                    out.new.extend(guard("guard/baseline-grew", path, &k.at, &k.rule));
                }
            }
        }
    }
    out.pass = out.new.is_empty();
    out
}

/// A fixture's baseline rewritten from its unignored `found`: what `old` knew, plus errors of rules newer than it.
pub fn tighten(old: Option<&Baseline>, found: &[Finding]) -> Baseline {
    let floor = old.map_or(0, |b| b.guard);
    let mut known: Vec<Known> = found
        .iter()
        .filter(|f| f.severity == Severity::Error && !f.rule.starts_with("guard/"))
        .map(known)
        .filter(|k| old.is_some_and(|b| b.known.contains(k)) || rule(&k.rule).is_some_and(|r| r.since > floor))
        .collect();
    known.sort();
    known.dedup();
    Baseline { guard: VERSION, known }
}
