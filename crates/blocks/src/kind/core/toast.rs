use crate::kind::{Block, Fallback, Tone, Undo};

listed! { 31: Toast(Toast) = "toast" }

kind! {
    /// A short line after an action, in a tone, with an optional undo: an answer's toast, or drawn where it sits.
    pub struct Toast {
        id: Option<String>,
        tone: Option<Tone>,
        title: String,
        undo: Option<Undo>,
        fallback: Option<Fallback>,
    }
}

pub(super) fn sample() -> Vec<Block> {
    let ids = serde_json::Value::from(vec!["o-4821", "o-4822", "o-4825"]);
    let undo = Undo {
        action: "unarchive".into(),
        values: Some([("ids".to_string(), ids)].into_iter().collect()),
        ..Undo::default()
    };
    vec![Block::Toast(Box::new(
        Toast::new("Archived 3 orders").id("archived").tone(Tone::Ok).undo(undo),
    ))]
}
