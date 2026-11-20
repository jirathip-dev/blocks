use serde::{Deserialize, Serialize};

use crate::kind::Block;

listed! { 26: Nav(Nav) = "nav" }

wire! {
    /// A link of a site's bar.
    pub struct NavLink {
        label: String,
        href: String,
        current: Option<bool>,
    }
}

kind! {
    /// A site's link bar.
    pub struct Nav {
        id: Option<String>,
        brand: Option<NavLink>,
        links: Vec<NavLink>,
    }
}

pub(super) fn sample() -> Vec<Block> {
    let link = |label: &str, href: &str| NavLink {
        label: label.into(),
        href: href.into(),
        current: None,
    };
    vec![Block::Nav(Box::new(
        Nav::new(vec![link("Docs", "/docs")])
            .id("nav")
            .brand(link("Blocks", "/")),
    ))]
}
