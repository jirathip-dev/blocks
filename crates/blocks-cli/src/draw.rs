use std::collections::BTreeMap;
use std::process::Command;

use blocks::guard::{self, Config, Finding, Plan, Run, Seen};

use crate::files::{self, Fixture};

const PHONE: &str = "390x844";
const DESK: &str = "1440x900";

fn runs<'a>(
    config: &Config,
    screens: impl IntoIterator<Item = (&'a String, &'a Fixture)>,
    sizes: &[&str],
    probes: bool,
) -> Vec<Run> {
    let mut out = vec![];
    for (name, fx) in screens {
        for size in sizes {
            out.push(Run {
                name: if probes {
                    name.clone()
                } else {
                    format!("{}/{name}", size.split('x').next().unwrap_or(size))
                },
                screen: fx.path.clone(),
                size: (*size).into(),
                css: config.css.clone(),
                scripts: config.scripts.clone(),
                kinds: config.kinds.clone(),
                steps: vec![],
                probes,
            });
        }
    }
    out
}

fn draw(config: &Config, runs: &[Run], out: &str) -> Result<Vec<Seen>, String> {
    if config.harness.is_empty() {
        return Err(format!("{}: no `harness` to draw the screens with", files::CONFIG));
    }
    let mut seen = vec![];
    for (i, cmd) in config.harness.iter().enumerate() {
        let out = if i == 0 { out.to_string() } else { format!("{out}.{i}") };
        let (plan, saw) = (format!("{out}/plan.json"), format!("{out}/seen.json"));
        std::fs::create_dir_all(&out).map_err(|e| format!("{out}: {e}"))?;
        files::remove(&saw)?;
        let body = crate::json(&Plan {
            out: out.clone(),
            runs: runs.to_vec(),
        })?;
        std::fs::write(&plan, body).map_err(|e| format!("{plan}: {e}"))?;
        let (bin, args) = cmd.split_first().ok_or("an empty `harness` command")?;
        let st = Command::new(bin)
            .args(args)
            .args(["--plan", &plan])
            .status()
            .map_err(|e| format!("{bin}: {e}"))?;
        if !st.success() {
            return Err(format!("{}: {st}", cmd.join(" ")));
        }
        seen.extend(files::read::<Vec<Seen>>(&saw)?.ok_or_else(|| format!("{saw}: not written"))?);
    }
    Ok(seen)
}

pub(crate) fn render(config: &Config, screens: &BTreeMap<String, Fixture>) -> Result<Vec<Finding>, String> {
    let mut found = vec![];
    for s in draw(config, &runs(config, screens, &[PHONE], true), "shots/render")? {
        let fixture = match (&s.file, s.run.as_deref().and_then(|r| screens.get(r))) {
            (Some(_), _) => "",
            (None, Some(fx)) => &fx.path,
            (None, None) => return Err(format!("the harness saw {} in no run of the plan", s.rule)),
        };
        let rule = s.rule.clone();
        found.push(guard::finding(s, fixture).ok_or_else(|| format!("the harness saw {rule}, which is no rule"))?);
    }
    Ok(found)
}

pub(crate) fn shots(config: &Config, screens: &BTreeMap<String, Fixture>, names: &[String]) -> Result<String, String> {
    let picked = names
        .iter()
        .map(|n| {
            screens
                .get_key_value(n)
                .ok_or_else(|| format!("--shot {n}: no such fixture"))
        })
        .collect::<Result<Vec<_>, _>>()?;
    draw(config, &runs(config, picked, &[PHONE, DESK], false), "shots")?;
    Ok(names
        .iter()
        .flat_map(|n| ["390", "1440"].map(|w| format!("shots/{w}/{n}/{n}.png\n")))
        .collect())
}
