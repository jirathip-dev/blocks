use crate::kind::Block;

listed! { 16: Web(Web) = "web" }

kind! {
    /// A web view of a fixed height.
    pub struct Web {
        id: Option<String>,
        src: String,
        height: u32,
    }
}

pub(super) fn sample() -> Vec<Block> {
    vec![Block::Web(Box::new(Web::new("/doc", 240_u32).id("doc")))]
}
