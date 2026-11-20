use crate::kind::{Block, Hunk};

listed! { 17: Diff(Diff) = "diff" }

kind! {
    /// A file's diff.
    pub struct Diff {
        id: Option<String>,
        file: String,
        summary: Option<String>,
        hunks: Vec<Hunk>,
    }
}

pub(super) fn sample() -> Vec<Block> {
    let hunk = Hunk {
        at: "@@ -1 +1 @@".into(),
        lines: vec!["-a".into(), "+b".into()],
    };
    vec![Block::Diff(Box::new(Diff::new("src/lib.rs", vec![hunk]).id("change")))]
}
