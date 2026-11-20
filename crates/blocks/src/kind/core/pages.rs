use crate::kind::{Block, Fallback, PageImage};

listed! { 32: Pages(Pages) = "pages" }

kind! {
    /// A document as the app's server drew it, one picture a page: paged and zoomed in the view, with its PDF.
    pub struct Pages {
        id: Option<String>,
        title: Option<String>,
        pages: Vec<PageImage>,
        file: Option<String>,
        note: Option<String>,
        fallback: Option<Fallback>,
    }
}

pub(super) fn sample() -> Vec<Block> {
    let page = |n: u32, alt: &str| PageImage {
        src: format!("/q/0418/{n}.png"),
        alt: alt.into(),
        width: 1240,
        height: 1754,
    };
    vec![Block::Pages(Box::new(
        Pages::new(vec![
            page(1, "Cover and priced items: 8 lines, total 51,092.50 including VAT"),
            page(2, "Terms and conditions, clauses 1 to 6"),
            page(3, "Programme of works and the acceptance signature box"),
        ])
        .id("quote")
        .title("Q-2026-0418 rev 3")
        .file("/q/0418.pdf")
        .note("Out of date: the prices changed after this was drawn."),
    ))]
}
