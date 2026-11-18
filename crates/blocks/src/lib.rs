mod ops;
mod screen;
mod stream;

#[cfg(feature = "schema")]
pub mod codegen;

pub use ops::{apply, diff, ApplyError, Op};
pub use screen::{Block, Row, Screen};
pub use stream::{Body, Frame, Replica, Stream};

/// The wire schema's version: docs/schema.md says when it changes.
pub const SCHEMA_VERSION: u32 = 1;
