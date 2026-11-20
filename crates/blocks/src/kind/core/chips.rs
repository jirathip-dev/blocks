use crate::kind::{Block, ChipOption};

listed! { 12: Chips(Chips) = "chips" }

kind! {
    /// A row of chips, one or many selected.
    pub struct Chips {
        id: Option<String>,
        name: String,
        multi: Option<bool>,
        action: Option<String>,
        selected: Option<Vec<String>>,
        options: Vec<ChipOption>,
    }
}

pub(super) fn sample() -> Vec<Block> {
    let chip = |v: &str| ChipOption {
        value: v.into(),
        label: v.into(),
    };
    vec![Block::Chips(Box::new(
        Chips::new("effort", vec![chip("low"), chip("high")]).id("effort"),
    ))]
}
