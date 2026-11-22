use std::io::{Read as _, Write as _};

use blocks::catalog::Catalog;
use blocks::model;

pub(crate) fn run(args: &[String]) -> Result<bool, String> {
    let [path] = args else {
        return Err(crate::USAGE.into());
    };
    let json = std::fs::read_to_string(path).map_err(|e| format!("{path}: {e}"))?;
    let catalog = Catalog::read(&json).map_err(|e| format!("{path}: {e}"))?;
    let mut text = String::new();
    std::io::stdin()
        .read_to_string(&mut text)
        .map_err(|e| format!("stdin: {e}"))?;
    let (out, fit) = match model::read(&catalog, "reply", &text) {
        Ok(fit) => (
            serde_json::to_string_pretty(&fit.blocks).map_err(|e| e.to_string())?,
            true,
        ),
        Err(no) => (no.say(), false),
    };
    writeln!(std::io::stdout(), "{out}").map_err(|e| e.to_string())?;
    Ok(fit)
}
