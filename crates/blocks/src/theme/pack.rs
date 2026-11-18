use serde::{Deserialize, Serialize};

use super::PerMode;

/// A pack's theme.json: its label, default schemes, art flags and words.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Theme {
    pub label: String,
    pub scheme: PerMode<String>,
    pub sprites: bool,
    pub moments: bool,
    pub words: std::collections::BTreeMap<String, String>,
}

/// A vendored swag pack: its name and its files, compiled in.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Pack {
    pub name: &'static str,
    pub files: &'static [(&'static str, &'static [u8])],
}

macro_rules! pack {
    ($name:literal) => {
        Pack {
            name: $name,
            files: &[
                pack!(@file $name, "theme.json"),
                pack!(@file $name, "sprites.svg"),
                pack!(@file $name, "scene.svg"),
                pack!(@file $name, "icon.png"),
            ],
        }
    };
    (@file $name:literal, $file:literal) => {
        ($file, include_bytes!(concat!("../../../../theme/packs/", $name, "/", $file)))
    };
}

/// swag's packs at the commit theme/packs/SOURCE names.
pub fn packs() -> &'static [Pack] {
    const PACKS: [Pack; 3] = [pack!("farm"), pack!("garden"), pack!("kitchen")];
    &PACKS
}
