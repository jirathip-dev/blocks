use crate::kind::{Block, Image, ImageSize};

listed! { 15: Images(Images) = "images" }

kind! {
    /// A strip of images.
    pub struct Images {
        id: Option<String>,
        size: Option<ImageSize>,
        items: Vec<Image>,
    }
}

pub(super) fn sample() -> Vec<Block> {
    let image = Image {
        src: "/media/a.png".into(),
        alt: Some("a".into()),
        caption: None,
    };
    vec![Block::Images(Box::new(Images::new(vec![image]).id("shots")))]
}
