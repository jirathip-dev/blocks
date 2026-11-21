use serde::{Deserialize, Serialize};

use crate::kind::{Block, Part, Prose, Span, Tap, Tool, ToolState};

listed! { 35: Message(Message) = "message" }

words!(
    /// Who sent a message: an agent, the owner, or the system.
    Role { Agent, Owner, System }
);

wire! {
    /// A message's attachment: its name and what opens it; with `src` it is an image, drawn small.
    pub struct Attachment {
        name: String,
        tap: Tap,
        src: Option<String>,
    }
}

kind! {
    /// One message of a conversation: who said it, what was said as blocks, and its attachments.
    pub struct Message {
        id: Option<String>,
        role: Role,
        name: String,
        avatar: Option<String>,
        blocks: Option<Vec<Block>>,
        files: Option<Vec<Attachment>>,
    }
}

fn said(id: &str, text: &str) -> Block {
    let spans = vec![Span {
        text: text.into(),
        ..Span::default()
    }];
    Block::Prose(Box::new(Prose::new(vec![Part::Para { spans }]).id(id)))
}

pub(super) fn sample() -> Vec<Block> {
    let file = |name: &str, src: Option<&str>| Attachment {
        name: name.into(),
        tap: Tap {
            url: Some(format!("/files/{name}")),
            ..Tap::default()
        },
        src: src.map(Into::into),
    };
    let read = Tool::new("Read", ToolState::Done)
        .id("chat-read")
        .summary("patch.rs, 238 lines")
        .body("use std::fmt;");
    vec![Block::Message(Box::new(
        Message::new(Role::Agent, "Scout")
            .id("chat")
            .avatar("/media/sample.svg")
            .blocks(vec![
                said("chat-a", "Reading both files."),
                Block::Tool(Box::new(read)),
                Block::Prose(Box::new(Prose::new(vec![]).id("chat-b").streaming(true))),
            ])
            .files(vec![
                file("plan.pdf", None),
                file("shot.png", Some("/media/sample.svg")),
            ]),
    ))]
}
