use crate::expr::Expr;
use crate::kind::{Block, ButtonStyle, Confirm, Fields, Tap};

listed! { 11: Button(Button) = "button" }

kind! {
    /// A button.
    pub struct Button {
        id: Option<String>,
        label: String,
        style: Option<ButtonStyle>,
        action: Option<String>,
        values: Option<Fields>,
        tap: Option<Tap>,
        confirm: Option<Confirm>,
        enabled: Option<Expr>,
    }
}

pub(super) fn sample() -> Vec<Block> {
    vec![Block::Button(Box::new(Button::new("Save").id("save").action("save")))]
}
