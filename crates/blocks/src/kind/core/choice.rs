use crate::kind::{Block, ChoiceDefault, ChoiceOption, Fields, Other};

listed! { 6: Choice(Choice) = "choice" }

kind! {
    /// A question with options, a free answer and a default.
    pub struct Choice {
        id: Option<String>,
        action: String,
        question: Option<String>,
        recommended: Option<String>,
        options: Vec<ChoiceOption>,
        other: Option<Other>,
        default: Option<ChoiceDefault>,
        values: Option<Fields>,
    }
}

pub(super) fn sample() -> Vec<Block> {
    let option = ChoiceOption {
        value: "yes".into(),
        label: "Yes".into(),
        ..ChoiceOption::default()
    };
    vec![Block::Choice(Box::new(
        Choice::new("answer", vec![option]).id("ask").question("Merge it?"),
    ))]
}
