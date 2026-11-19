pub mod behave;
mod built;
mod diff;
pub mod expr;
pub mod guard;
mod kind;
pub mod layout;
mod mirror;
mod patch;
mod shelf;
pub mod site;
pub mod theme;
pub mod tree;
pub mod web;
pub mod wire;

#[cfg(feature = "schema")]
pub mod codegen;

pub use built::{Built, Fault};
pub use diff::diff;
pub use kind::*;
pub use mirror::{Mirror, Took};
pub use patch::{apply, ApplyError};
pub use shelf::{Delta, Put, Shelf};
pub use wire::{
    Action, Answer, Bye, Child, Format, Frame, Have, Hello, KeyState, MediaType, OldFrame, Op, Outdated, Sync, Synced,
    Why,
};

/// The wire schema's version: docs/schema.md says when it changes.
pub const SCHEMA_VERSION: u8 = 1;
