pub mod layout;
mod mirror;
mod ops;
mod screen;
mod shelf;
pub mod theme;
pub mod wire;

#[cfg(feature = "schema")]
pub mod codegen;

pub use mirror::{Mirror, Took};
pub use ops::{apply, diff, ApplyError, Child, Op};
pub use screen::*;
pub use shelf::{Delta, Put, Shelf};
pub use wire::{Bye, Format, Frame, Have, Hello, KeyState, MediaType, OldFrame, Outdated, Sync, Synced, Why};

/// The wire schema's version: docs/schema.md says when it changes.
pub const SCHEMA_VERSION: u8 = 1;
