mod ops;
mod screen;
mod stream;

#[cfg(feature = "schema")]
pub mod codegen;

pub use ops::{apply, diff, ApplyError, Child, Op};
pub use screen::*;
pub use stream::{Frame, Replica, Stream};

/// The wire schema's version: docs/schema.md says when it changes.
pub const SCHEMA_VERSION: u32 = 1;
