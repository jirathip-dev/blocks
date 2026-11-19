use std::io::Write as _;
use std::path::Path;

use blocks::guard::{self, Config};

use crate::files;

pub(crate) fn run(args: &[String]) -> Result<bool, String> {
    let [flag, to] = args else {
        return Err(crate::USAGE.into());
    };
    if flag != "--to" {
        return Err(format!("{flag}: unknown flag; {}", crate::USAGE));
    }
    let config: Config = files::read(files::CONFIG)?.unwrap_or_default();
    let screens = files::screens(&config, &mut vec![])?;
    let kinds: Vec<&str> = config.kinds.iter().map(String::as_str).collect();
    let mut pages: Vec<(String, String)> = crate::gen::skill::FILES
        .iter()
        .map(|(p, t)| ((*p).into(), (*t).into()))
        .collect();
    let mut pass = true;
    for name in &config.examples {
        let fx = screens
            .get(name)
            .ok_or_else(|| format!("{}: example `{name}` is no fixture in `screens`", files::CONFIG))?;
        match guard::example(name, &fx.screen, &kinds) {
            Ok(page) => pages.push((format!("examples/{name}.md"), page)),
            Err(seen) => {
                pass = false;
                for s in seen {
                    writeln!(std::io::stderr(), "{}: an example with {} at {}", fx.path, s.rule, s.at)
                        .map_err(|e| e.to_string())?;
                }
            }
        }
    }
    if !pass {
        return Ok(false);
    }
    for (p, text) in pages {
        let path = Path::new(to).join(p);
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir).map_err(|e| format!("{}: {e}", dir.display()))?;
        }
        std::fs::write(&path, text).map_err(|e| format!("{}: {e}", path.display()))?;
    }
    Ok(true)
}
