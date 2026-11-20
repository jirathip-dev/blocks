use crate::kind::Block;

listed! { 10: Run(Run) = "run" }

kind! {
    /// A command the owner approves to run.
    pub struct Run {
        id: Option<String>,
        action: String,
        command: String,
        sha: String,
        dir: Option<String>,
        touches: Option<String>,
        until: Option<String>,
    }
}

pub(super) fn sample() -> Vec<Block> {
    vec![Block::Run(Box::new(
        Run::new("approve", "cargo test", "4f2a9c1").id("run").dir("crates"),
    ))]
}
