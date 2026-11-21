use crate::kind::{Accessory, Act, Block, Figure, Label, Round, RowStyle, Shown, Tap, Toned};

listed! { 4: Row(Row) = "row" }

kind! {
    /// One row of a list.
    pub struct Row {
        id: Option<String>,
        #[serde(default)]
        title: String,
        subtitle: Option<Toned>,
        badge: Option<Label>,
        figure: Option<Figure>,
        value: Option<Shown>,
        accessory: Option<Accessory>,
        swipe: Option<Vec<Act>>,
        tap: Option<Tap>,
        menu: Option<Vec<Act>>,
        indent: Option<u8>,
        style: Option<RowStyle>,
        button: Option<Act>,
        handle: Option<bool>,
        lifted: Option<bool>,
        changed: Option<bool>,
        sticky: Option<bool>,
        rounds: Option<Vec<Round>>,
    }
}

pub(super) fn build() -> Row {
    Row::new("Build")
        .id("build")
        .subtitle(Toned::Text("green".into()))
        .value(Shown::Text("2m".into()))
}

pub(super) fn sample() -> Vec<Block> {
    vec![Block::Row(Box::new(build()))]
}
