mod built;
mod diff;
pub mod expr;
mod kind;
mod patch;
mod stream;
pub mod theme;
mod wire;

#[cfg(feature = "schema")]
pub mod codegen;

pub use built::{Built, Fault};
pub use diff::diff;
pub use kind::*;
pub use patch::{apply, ApplyError};
pub use stream::{Frame, Replica, Stream};
pub use wire::{Action, Answer, Child, Op};

/// The wire schema's version: docs/schema.md says when it changes.
pub const SCHEMA_VERSION: u32 = 1;
