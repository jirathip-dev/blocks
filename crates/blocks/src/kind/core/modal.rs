use serde::{Deserialize, Serialize};

use crate::kind::sample::text;
use crate::kind::{Block, Locale, Submit};

listed! { 1: Modal(Modal) = "modal", 1: #[doc = "The modal kind under its older name, drawn the same way: write `modal` in a new screen."] Sheet(Modal) = "sheet" }

words!(ModalVariant { Dialog, Alert, Tool });

kind! {
    /// A box over a screen: a dialog dragged by its header, a fixed confirm or alert, or a tool window that resizes and folds to a pill.
    pub struct Modal {
        id: Option<String>,
        title: String,
        variant: Option<ModalVariant>,
        message: Option<String>,
        ok: Option<String>,
        destructive: Option<bool>,
        cancel: Option<String>,
        done: Option<Submit>,
        blocks: Vec<Block>,
        locale: Option<Locale>,
    }
}

pub(super) fn sample() -> Vec<Block> {
    let save = Submit {
        label: "save".into(),
        action: "save-item".into(),
        ..Submit::default()
    };
    vec![
        Block::Modal(Box::new(
            Modal::new("Edit item", vec![text("modal-note", "Pick a name")])
                .id("edit-item")
                .cancel("cancel")
                .done(save),
        )),
        Block::Modal(Box::new(
            Modal::new("Delete 3 items?", vec![text("delete-note", "Plan, Notes and Draft")])
                .id("delete-items")
                .variant(ModalVariant::Alert)
                .message("They move to the bin.")
                .ok("delete")
                .destructive(true)
                .cancel("cancel"),
        )),
        Block::Modal(Box::new(
            Modal::new("Layers", vec![text("layers-note", "Header, Title, Body")])
                .id("layers")
                .variant(ModalVariant::Tool),
        )),
        Block::Sheet(Box::new(
            Modal::new("Add a repo", vec![text("sheet-note", "Pick one")]).id("add"),
        )),
    ]
}
